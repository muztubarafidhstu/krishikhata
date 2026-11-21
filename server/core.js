'use strict';
// Shared helpers: errors, money, SMS queue, notifications, OTP gate, subscription state, audit.
const { get, all, run, getSetting, today, daysBetween } = require('./db');
const { hmac, normPhone, maskPhone } = require('./security');

class HttpError extends Error {
  constructor(status, bn, en, extra = {}) { super(en || bn); this.status = status; this.bn = bn; this.en = en || bn; this.extra = extra; }
}
const fail = (status, bn, en, extra) => { throw new HttpError(status, bn, en, extra); };

// Accepts numbers or numeric strings (Bangla digits allowed). Returns a finite number rounded to 2 decimals.
function money(v, { min = 0, max = 1e10, name = 'amount' } = {}) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/[,\s৳]/g, ''));
  if (!Number.isFinite(n) || n < min || n > max) fail(400, `সঠিক সংখ্যা দিন (${name})`, `Enter a valid number (${name})`);
  return Math.round(n * 100) / 100;
}
const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);

/* ---------- SMS queue (sent by the ESP32 gateway) ---------- */
function queueSms(phone, text, kind = 'info') {
  const p = normPhone(phone);
  if (!/^01\d{9}$/.test(p)) return;
  run('INSERT INTO sms(phone,text,kind,status,created_at) VALUES(?,?,?,?,?)', p, String(text).slice(0, 160), kind, 'pending', Date.now());
}

/* ---------- Owner notifications (in-app + SMS) ---------- */
function notify(bid, bn, en, smsText) {
  run('INSERT INTO notifications(business_id,date,text_bn,text_en) VALUES(?,?,?,?)', bid, today(), bn, en);
  const admin = get("SELECT phone FROM users WHERE business_id=? AND role='admin'", bid);
  if (admin && smsText !== false) queueSms(admin.phone, smsText || en);
}

/* ---------- Subscription ---------- */
function subState(b) {
  if (b.status === 'off') return 'off';
  const dl = daysBetween(today(), b.expiry);
  if (dl < 0) return 'expired';
  if (dl <= 7) return 'soon';
  return 'active';
}
const isLocked = (b) => ['off', 'expired'].includes(subState(b));
// A shop can have its own price; empty means the standard price.
const plansFor = (b) => { const P = plans(b.btype); return { ...P, monthly: b.price_monthly ?? P.monthly, yearly: b.price_yearly ?? P.yearly, custom: b.price_monthly != null || b.price_yearly != null }; };
// Each business type (agri / build) has its own standard prices. Agri keeps the original setting names.
const sk = (k, t) => (t === 'build' ? k + '_build' : k);
const plans = (t = 'agri') => ({
  monthly: Number(getSetting(sk('plan_monthly', t), t === 'build' ? '700' : '500')),
  yearly: Number(getSetting(sk('plan_yearly', t), t === 'build' ? '7000' : '5000')),
  trialDays: Number(getSetting(sk('plan_trial_days', t), '14')),
  payTo: getSetting('pay_to', ''),
  whatsapp: getSetting('whatsapp', ''),
});

/* ---------- OTP gate ----------
   When OTP is switched on (super admin setting), a protected request first gets HTTP 428 with an otpId.
   The browser shows the OTP box and repeats the same request with otpId + otpCode. */
const otpEnabled = () => getSetting('otp_enabled', '0') === '1';
function otpGate(req, { purpose, key, phone, label }) {
  if (!otpEnabled()) return;
  const { otpId, otpCode } = req.body || {};
  if (otpId) {
    const row = get('SELECT * FROM otps WHERE id=?', Number(otpId));
    if (!row || row.used || row.purpose !== purpose || row.key !== key) fail(400, 'OTP মেলেনি। আবার শুরু করুন।', 'OTP does not match this request. Start again.');
    if (Date.now() > row.expires_at) fail(400, 'OTP-র মেয়াদ শেষ। আবার পাঠান।', 'The OTP expired. Send a new one.', { otpRetry: true, expired: true });
    if (row.tries >= 3) fail(400, '৩ বার ভুল কোড। আবার শুরু করুন।', 'Wrong code 3 times. Start again.');
    const code = String(otpCode ?? '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).trim();
    if (hmac(row.id + ':' + code) !== row.code_hash) {
      run('UPDATE otps SET tries=tries+1 WHERE id=?', row.id);
      const left = 2 - row.tries;
      if (left <= 0) fail(400, '৩ বার ভুল কোড। আবার শুরু করুন।', 'Wrong code 3 times. Start again.');
      fail(400, `ভুল কোড। আর ${left} বার চেষ্টা করা যাবে।`, `Wrong code. ${left} tries left.`, { otpRetry: true });
    }
    run('UPDATE otps SET used=1 WHERE id=?', row.id);
    return;
  }
  const p = normPhone(phone);
  const recent = get('SELECT COUNT(*) n FROM otps WHERE phone=? AND created_at>?', p, Date.now() - 3600000).n;
  if (recent >= 6) fail(429, 'এক ঘণ্টায় অনেকবার OTP চাওয়া হয়েছে। পরে চেষ্টা করুন।', 'Too many OTP requests this hour. Try later.');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const r = run('INSERT INTO otps(purpose,key,phone,code_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)', purpose, key, p, 'x', Date.now() + 5 * 60000, Date.now());
  const id = Number(r.lastInsertRowid);
  run('UPDATE otps SET code_hash=? WHERE id=?', hmac(id + ':' + code), id);
  queueSms(p, `${brandForReq(req).brand} OTP: ${code} for ${label || purpose}. Valid 5 minutes. Never share this code.`, 'otp');
  throw new HttpError(428, 'OTP পাঠানো হয়েছে', 'OTP sent', { otpRequired: true, otpId: id, to: maskPhone(p), label });
}

// Product name for messages: KrishiKhata or NirmanKhata, from a shop row or a request.
const brandOf = (t) => TYPES[t === 'build' ? 'build' : 'agri'];
function brandForReq(req) {
  if (req.biz) return brandOf(req.biz.btype);
  if (req.btype) return brandOf(req.btype);
  const u = req.user && req.user.business_id ? get('SELECT btype FROM businesses WHERE id=?', req.user.business_id) : null;
  return brandOf(u ? u.btype : 'agri');
}
function audit(userId, action, detail = '') { run('INSERT INTO audit(user_id,action,detail) VALUES(?,?,?)', userId || null, action, String(detail).slice(0, 500)); }

// Business types: agricultural inputs (KrishiKhata) and building materials (NirmanKhata).
const TYPES = {
  agri: { cats: ['seed', 'fert', 'pest'], brand: 'KrishiKhata', bn: 'কৃষিখাতা' },
  build: { cats: ['rod', 'cement', 'tin', 'sheet', 'angle', 'bar', 'other'], brand: 'NirmanKhata', bn: 'নির্মাণখাতা' },
};
const btypeOk = (t) => (TYPES[t] ? t : 'agri');
const CATS = [...TYPES.agri.cats, ...TYPES.build.cats];
const MODULE_KEYS = ['inv', 'cat', 'pur', 'sale', 'invc', 'due', 'exp', 'rep', 'box', 'shop', 'app'];
const UNITS = ['kg', 'bag', 'bottle', 'packet', 'liter', 'ton', 'piece', 'bundle', 'feet'];
const EXP_TYPES = ['rent', 'salary', 'transport', 'power', 'tea', 'other'];
const METHODS = ['bkash', 'nagad', 'rocket', 'cash', 'bank'];

// Starter product list for a new shop (stock 0 — the owner edits prices and adds stock through Purchases).
const STARTER = [
  { cat: 'seed', name: 'হাইব্রিড ধান বীজ (ব্রি-২৮)', unit: 'kg', buy: 95, sell: 120, min: 50 },
  { cat: 'seed', name: 'হাইব্রিড ভুট্টা বীজ', unit: 'kg', buy: 480, sell: 560, min: 30 },
  { cat: 'seed', name: 'টমেটো বীজ', unit: 'packet', buy: 70, sell: 100, min: 25 },
  { cat: 'seed', name: 'পাট বীজ (তোষা)', unit: 'kg', buy: 160, sell: 200, min: 20 },
  { cat: 'fert', name: 'ইউরিয়া সার (৫০ কেজি)', unit: 'bag', buy: 1250, sell: 1350, min: 20 },
  { cat: 'fert', name: 'টিএসপি সার (৫০ কেজি)', unit: 'bag', buy: 1300, sell: 1420, min: 20 },
  { cat: 'fert', name: 'এমওপি / পটাশ (৫০ কেজি)', unit: 'bag', buy: 1000, sell: 1100, min: 15 },
  { cat: 'fert', name: 'জিপসাম সার', unit: 'kg', buy: 14, sell: 18, min: 100 },
  { cat: 'pest', name: 'সাইপারমেথ্রিন ১০ইসি (১০০ মিলি)', unit: 'bottle', buy: 120, sell: 160, min: 30 },
  { cat: 'pest', name: 'ম্যানকোজেব ছত্রাকনাশক (৫০০ গ্রা)', unit: 'packet', buy: 210, sell: 260, min: 25 },
  { cat: 'pest', name: 'কার্বোফুরান ৫জি দানাদার', unit: 'kg', buy: 150, sell: 190, min: 40 },
  { cat: 'pest', name: 'গ্লাইফোসেট আগাছানাশক (১ লি)', unit: 'bottle', buy: 420, sell: 500, min: 10 },
  // Building materials — sample prices, the owner edits them.
  // Rod, sheet, angle, bar: size = 'MS' or 'SS', sold by weight. Tin: size = thickness, dims = size in feet, per_pack = pieces per bundle.
  { cat: 'rod', name: 'MS Rod 500W', size: 'MS', unit: 'kg', buy: 87, sell: 94, min: 500 },
  { cat: 'rod', name: 'MS Rod 400W', size: 'MS', unit: 'kg', buy: 85, sell: 92, min: 500 },
  { cat: 'cement', name: 'Cement PCC (50 kg)', unit: 'bag', buy: 500, sell: 530, min: 50 },
  { cat: 'cement', name: 'Cement OPC (50 kg)', unit: 'bag', buy: 540, sell: 575, min: 30 },
  { cat: 'tin', name: 'Tin 0.32 mm (2.5 x 8 ft)', size: '0.32 mm', dims: '2.5 x 8 ft', per_pack: 12, unit: 'bundle', buy: 9800, sell: 10500, min: 5 },
  { cat: 'tin', name: 'Tin 0.36 mm (2.5 x 10 ft)', size: '0.36 mm', dims: '2.5 x 10 ft', per_pack: 10, unit: 'bundle', buy: 12500, sell: 13400, min: 5 },
  { cat: 'sheet', name: 'MS Sheet', size: 'MS', unit: 'kg', buy: 105, sell: 115, min: 200 },
  { cat: 'sheet', name: 'SS Sheet', size: 'SS', unit: 'kg', buy: 320, sell: 360, min: 50 },
  { cat: 'angle', name: 'MS Angle', size: 'MS', unit: 'kg', buy: 98, sell: 108, min: 100 },
  { cat: 'angle', name: 'SS Angle', size: 'SS', unit: 'kg', buy: 330, sell: 370, min: 50 },
  { cat: 'bar', name: 'MS Flat Bar', size: 'MS', unit: 'kg', buy: 100, sell: 110, min: 100 },
  { cat: 'bar', name: 'MS Square Bar', size: 'MS', unit: 'kg', buy: 100, sell: 110, min: 100 },
];

module.exports = { brandOf, brandForReq, HttpError, fail, money, str, queueSms, notify, subState, isLocked, plans, plansFor, otpEnabled, otpGate, audit,
  TYPES, btypeOk, CATS, MODULE_KEYS, UNITS, EXP_TYPES, METHODS, STARTER, all };
