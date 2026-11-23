'use strict';
// Shared helpers: errors, money, SMS queue, notifications, OTP gate, subscription state, audit.
const { SEGMENTS, SEG } = require('./segments');
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
// Months a shop has already paid for (a yearly payment counts as 12).
const paidMonths = (bid) => get("SELECT COALESCE(SUM(CASE WHEN plan='yearly' THEN qty*12 ELSE qty END),0) n FROM sub_payments WHERE business_id=?", bid).n;
const plansFor = (b) => {
  const P = plans(b.btype), monthly = b.price_monthly ?? P.monthly;
  // Starter offer: a shop's first paid months cost less (e.g. 2 months at ৳200), then the normal price.
  const introLeft = P.introMonths > 0 && P.introPrice < monthly ? Math.max(0, P.introMonths - paidMonths(b.id)) : 0;
  return { ...P, monthly, yearly: b.price_yearly ?? P.yearly, custom: b.price_monthly != null || b.price_yearly != null, introLeft };
};
// What `qty` monthly payments cost: the starter months first, then the normal monthly price.
const monthlyCost = (P, qty) => { const a = Math.min(qty, P.introLeft || 0); return a * P.introPrice + (qty - a) * P.monthly; };
// Each business type has its own standard prices. Agri keeps the original setting names ("plan_monthly"),
// the others add their key ("plan_monthly_build", "plan_monthly_bike" …).
const sk = (k, t) => (!t || t === 'agri' ? k : k + '_' + t);
const plans = (t = 'agri') => ({
  monthly: Number(getSetting(sk('plan_monthly', t), String((SEG[t] || SEG.agri).monthly))),
  yearly: Number(getSetting(sk('plan_yearly', t), String((SEG[t] || SEG.agri).monthly * 10))),
  trialDays: Number(getSetting(sk('plan_trial_days', t), '30')),
  introPrice: Number(getSetting(sk('plan_intro_price', t), '200')),
  introMonths: Number(getSetting(sk('plan_intro_months', t), '2')),
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
const brandOf = (t) => TYPES[btypeOk(t)];
function brandForReq(req) {
  if (req.biz) return brandOf(req.biz.btype);
  if (req.btype) return brandOf(req.btype);
  const u = req.user && req.user.business_id ? get('SELECT btype FROM businesses WHERE id=?', req.user.business_id) : null;
  return brandOf(u ? u.btype : 'agri');
}
function audit(userId, action, detail = '') { run('INSERT INTO audit(user_id,action,detail) VALUES(?,?,?)', userId || null, action, String(detail).slice(0, 500)); }

// Business types: agricultural inputs (KrishiKhata) and building materials (NirmanKhata).
const TYPES = Object.fromEntries(SEGMENTS.map((s) => [s.key, { cats: s.cats, brand: s.en, bn: s.bn, num: s.num }]));
const btypeOk = (t) => (TYPES[t] ? t : 'agri');
const CATS = [...new Set(SEGMENTS.flatMap((s) => s.cats))];
const MODULE_KEYS = ['inv', 'cat', 'pur', 'sale', 'invc', 'due', 'exp', 'rep', 'box', 'shop', 'app'];
const UNITS = ['kg', 'bag', 'bottle', 'packet', 'liter', 'ton', 'piece', 'bundle', 'feet', 'thousand', 'cft', 'set', 'box', 'meter'];
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
  // Bike & car shops: the vehicles themselves are added one by one (with papers); these are parts.
  { cat: 'parts', name: 'হেলমেট (ফুল ফেস)', unit: 'piece', buy: 1200, sell: 1550, min: 5 },
  { cat: 'parts', name: 'ইঞ্জিন অয়েল (১ লিটার)', unit: 'piece', buy: 450, sell: 540, min: 10 },
  { cat: 'parts', name: 'চেইন-স্প্রোকেট সেট', unit: 'set', buy: 950, sell: 1200, min: 5 },
  // Brick field
  { cat: 'brick', name: '১ম শ্রেণির ইট', unit: 'thousand', buy: 9000, sell: 10500, min: 20 },
  { cat: 'brick', name: '২য় শ্রেণির ইট', unit: 'thousand', buy: 7500, sell: 9000, min: 20 },
  { cat: 'brick', name: 'পিকেট ইট', unit: 'thousand', buy: 6000, sell: 7200, min: 10 },
  { cat: 'khoa', name: 'ইটের খোয়া (১ম শ্রেণি)', unit: 'cft', buy: 110, sell: 135, min: 500 },
  { cat: 'block', name: 'কংক্রিট ব্লক (৮ ইঞ্চি)', unit: 'piece', buy: 45, sell: 56, min: 200 },
  { cat: 'other', name: 'বালু (সিলেট)', unit: 'cft', buy: 38, sell: 48, min: 500, types: ['brick'] },
  // Mobile & electronics
  { cat: 'phone', name: 'Samsung Galaxy A15 (4/128)', unit: 'piece', buy: 17500, sell: 19000, min: 3 },
  { cat: 'phone', name: 'Xiaomi Redmi 13C (4/128)', unit: 'piece', buy: 13800, sell: 15000, min: 3 },
  { cat: 'phone', name: 'Symphony বাটন ফোন', unit: 'piece', buy: 1300, sell: 1550, min: 5 },
  { cat: 'accessory', name: 'ফাস্ট চার্জার (২০W)', unit: 'piece', buy: 350, sell: 550, min: 10 },
  { cat: 'accessory', name: 'মোবাইল কভার', unit: 'piece', buy: 80, sell: 200, min: 20 },
  { cat: 'accessory', name: 'হেডফোন', unit: 'piece', buy: 250, sell: 450, min: 10 },
  { cat: 'electronics', name: 'LED টিভি ৩২ ইঞ্চি', unit: 'piece', buy: 14500, sell: 16500, min: 2 },
  { cat: 'electronics', name: 'সিলিং ফ্যান ৫৬ ইঞ্চি', unit: 'piece', buy: 2800, sell: 3300, min: 4 },
  // Furniture
  { cat: 'bed', name: 'সেগুন কাঠের খাট (৬x৭ ফুট)', unit: 'piece', buy: 32000, sell: 38000, min: 2 },
  { cat: 'sofa', name: '৫ সিটের সোফা সেট', unit: 'set', buy: 28000, sell: 34000, min: 2 },
  { cat: 'table', name: 'ডাইনিং টেবিল (৬ চেয়ার)', unit: 'set', buy: 30000, sell: 36000, min: 1 },
  { cat: 'almirah', name: 'কাঠের আলমারি (৩ দরজা)', unit: 'piece', buy: 26000, sell: 31000, min: 1 },
  { cat: 'door', name: 'মেহগনি কাঠের দরজা', unit: 'piece', buy: 9000, sell: 11000, min: 3 },
  { cat: 'other', name: 'ড্রেসিং টেবিল', unit: 'piece', buy: 12000, sell: 14500, min: 1, types: ['furniture'] },
  // Hardware & sanitary
  { cat: 'pipe', name: 'পিভিসি পাইপ ১/২" (২০ ফুট)', unit: 'piece', buy: 180, sell: 230, min: 30 },
  { cat: 'pipe', name: 'জিআই পাইপ ১" (২০ ফুট)', unit: 'piece', buy: 1450, sell: 1650, min: 10 },
  { cat: 'fitting', name: 'এলবো ১/২"', unit: 'piece', buy: 12, sell: 20, min: 100 },
  { cat: 'fitting', name: 'বল ভালভ ১/২"', unit: 'piece', buy: 140, sell: 190, min: 20 },
  { cat: 'sanitary', name: 'কমোড (সেট)', unit: 'set', buy: 6500, sell: 7800, min: 3 },
  { cat: 'sanitary', name: 'বেসিন', unit: 'piece', buy: 2200, sell: 2700, min: 3 },
  { cat: 'tiles', name: 'ফ্লোর টাইলস ২৪x২৪', unit: 'box', buy: 1300, sell: 1550, min: 20 },
  { cat: 'paint', name: 'প্লাস্টিক পেইন্ট (৩.৬৪ লি)', unit: 'piece', buy: 1450, sell: 1700, min: 10 },
  { cat: 'electric', name: 'ইলেকট্রিক তার ১.৫ মিমি (রোল)', unit: 'piece', buy: 2100, sell: 2450, min: 5 },
  { cat: 'electric', name: 'সুইচ (ওয়ান-ওয়ে)', unit: 'piece', buy: 45, sell: 70, min: 50 },
  { cat: 'tools', name: 'হাতুড়ি', unit: 'piece', buy: 250, sell: 350, min: 5 },
];

// Starter products for a new shop of type t with the chosen categories.
const starterFor = (t, cats) => STARTER.filter((x) => cats.includes(x.cat) && (!x.types || x.types.includes(t)));

module.exports = { brandOf, brandForReq, HttpError, fail, money, str, queueSms, notify, subState, isLocked, plans, plansFor, monthlyCost, otpEnabled, otpGate, audit,
  TYPES, btypeOk, CATS, MODULE_KEYS, UNITS, EXP_TYPES, METHODS, STARTER, starterFor, all };
