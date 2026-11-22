'use strict';
const express = require('express');
const { get, all, run, tx, getSetting, setSetting, today, addMonths } = require('../db');
const { decrypt, verifyPassword, hashPassword, encrypt, normPhone, validPhone, passOk } = require('../security');
const { requireSuper, unlockShop, tooMany, addFail, clearFails } = require('../auth');
const { fail, money, str, notify, otpGate, otpEnabled, plans, plansFor, audit, isLocked, CATS, TYPES, btypeOk, MODULE_KEYS, METHODS, brandOf } = require('../core');
const { bizSummary } = require('../state');
const { createBusiness } = require('../business');
const { PASS_MSG } = require('./auth');
const { slugValid, shopUrl, hostInfo, adminUrl } = require('../host');
const { SEGMENTS } = require('../segments');
const SLUG_MSG = ['ঠিকানায় শুধু ইংরেজি ছোট অক্ষর, সংখ্যা ও - চলবে (৩–৩০ অক্ষর)', 'Use only small English letters, numbers and - (3–30 characters)'];
const slugFree = (s, except) => !get('SELECT 1 x FROM businesses WHERE slug=? AND id<>?', s, except || 0);

const r = express.Router();
r.use(requireSuper);
// Which mother panel is this: agricultural (ADMIN_DOMAIN) or building materials (BUILD_ADMIN_DOMAIN)?
// Without separate addresses (local testing) the panel type can be picked with ?type=build.
r.use((req, _res, next) => { const h = hostInfo(req); req.btype = h.kind === 'admin' ? h.btype : btypeOk(String(req.query.type || req.body?.type || 'agri')); next(); });

// Only shops of this panel's type can be reached from it.
// A user is reachable from this panel if it is the super admin or belongs to a shop of this panel's type.
const userOr404 = (id, req) => {
  const u = get('SELECT u.*, COALESCE(b.btype,\'agri\') bt FROM users u LEFT JOIN businesses b ON b.id=u.business_id WHERE u.id=?', Number(id));
  if (!u || (u.role !== 'super' && u.bt !== req.btype)) fail(404, 'পাওয়া যায়নি', 'Not found');
  return u;
};
const bizOr404 = (id, req) => { const b = get('SELECT * FROM businesses WHERE id=?', Number(id)); if (!b || (b.btype || 'agri') !== req.btype) fail(404, 'ব্যবসা পাওয়া যায়নি', 'Business not found'); return b; };
const phoneTaken = (p, exceptId) => !!get('SELECT 1 x FROM users WHERE phone=? AND active=1 AND id<>?', normPhone(p), exceptId || 0);
const fmtDateEn = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtDateBn = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Super admin start page (adminr.<domain>): every software at a glance, with a link to its mother panel.
r.get('/overview', (req, res) => {
  const month = today().slice(0, 7);
  res.json(SEGMENTS.map((s) => {
    const shops = all("SELECT * FROM businesses WHERE COALESCE(btype,'agri')=?", s.key);
    const ids = shops.map((b) => Number(b.id)).join(',');
    const sum = (sql) => (ids ? get(sql.replace('IDS', ids), month).v : 0);
    return {
      key: s.key, num: s.num, url: adminUrl(s.key), shops: shops.length,
      active: shops.filter((b) => !isLocked(b)).length, locked: shops.filter((b) => isLocked(b)).length,
      trial: shops.filter((b) => b.plan === 'trial' && !isLocked(b)).length,
      sales: sum('SELECT COALESCE(SUM(total),0) v FROM sales WHERE business_id IN (IDS) AND void=0 AND substr(date,1,7)=?'),
      income: sum('SELECT COALESCE(SUM(amount),0) v FROM sub_payments WHERE business_id IN (IDS) AND substr(date,1,7)=?'),
      price: plans(s.key).monthly,
    };
  }));
});

r.get('/state', (req, res) => {
  const lastSeen = Number(getSetting('gateway_last_seen', '0'));
  res.json({
    businesses: all("SELECT * FROM businesses WHERE COALESCE(btype,'agri')=? ORDER BY id", req.btype).map(bizSummary),
    btype: req.btype, plans: plans(req.btype), otp: otpEnabled(),
    gateway: { lastSeen, pending: get("SELECT COUNT(*) n FROM sms WHERE status IN ('pending','sending')").n },
    superAcc: { id: req.user.id, name: req.user.name, phone: req.user.phone },
    today: today(),
  });
});

r.get('/users', (req, res) => {
  res.json(all(`SELECT u.id,u.role,u.name,u.phone,u.seller_code,u.business_id,b.name bname FROM users u LEFT JOIN businesses b ON b.id=u.business_id
    WHERE u.active=1 AND (u.role='super' OR COALESCE(b.btype,'agri')=?) ORDER BY CASE u.role WHEN 'super' THEN 0 ELSE 1 END, u.business_id, CASE u.role WHEN 'admin' THEN 0 ELSE 1 END, u.seller_code`, req.btype));
});

// The owner asked to be able to see passwords. Each view is written to the audit log.
r.post('/users/:id/reveal', (req, res) => {
  const u = userOr404(req.params.id, req);
  audit(req.user.id, 'reveal-password', 'user ' + u.id);
  res.json({ password: decrypt(u.pass_enc) });
});

// Super admin sets a new password for anyone. OTP goes to the super admin's own phone.
r.post('/users/:id/password', (req, res) => {
  const u = userOr404(req.params.id, req);
  const pw = String(req.body.password || '').trim();
  if (!passOk(pw)) fail(400, ...PASS_MSG);
  otpGate(req, { purpose: 'pw-admin', key: 'user:' + u.id, phone: req.user.phone, label: 'password reset of ' + u.phone });
  run('UPDATE users SET pass_hash=?, pass_enc=? WHERE id=?', hashPassword(pw), encrypt(pw), u.id);
  if (u.id !== req.user.id) run('DELETE FROM sessions WHERE user_id=?', u.id);
  audit(req.user.id, 'password-set', 'user ' + u.id);
  res.json({ ok: true });
});

r.post('/businesses', (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80), owner = str(b.owner, 60);
  if (!name || !owner) fail(400, 'ব্যবসার নাম ও মালিকের নাম লিখুন', 'Enter the business and owner names');
  const cats = (Array.isArray(b.cats) ? b.cats : []).filter((c) => TYPES[req.btype].cats.includes(c));
  if (!cats.length) fail(400, 'অন্তত একটি পণ্যের ধরন বাছাই করুন', 'Pick at least one product type');
  const slug = String(b.slug || '').trim().toLowerCase();
  if (!slugValid(slug)) fail(400, ...SLUG_MSG);
  if (!slugFree(slug)) fail(409, 'এই ঠিকানা আগেই নেওয়া হয়েছে', 'This address is already taken');
  const modules = [...new Set(['inv', 'cat', 'sale', ...(Array.isArray(b.modules) ? b.modules : [])])].filter((m) => MODULE_KEYS.includes(m));
  const admin = { phone: normPhone(b.admin?.phone), password: String(b.admin?.password || '').trim() };
  if (!validPhone(admin.phone)) fail(400, 'অ্যাডমিনের সঠিক মোবাইল নম্বর দিন', 'Enter a valid admin mobile number');
  if (phoneTaken(admin.phone)) fail(409, 'এই অ্যাডমিন নম্বরে আগে থেকেই একটি আইডি আছে', 'This admin number already has an ID');
  if (!passOk(admin.password)) fail(400, 'অ্যাডমিন: ' + PASS_MSG[0], 'Admin: ' + PASS_MSG[1]);
  const sellers = (Array.isArray(b.sellers) ? b.sellers : []).slice(0, 3).map((s) => ({ name: str(s.name, 60), phone: normPhone(s.phone), password: String(s.password || '').trim() }));
  const seen = new Set([admin.phone]);
  sellers.forEach((s, i) => {
    const t = [`সেলার ${i + 1}: `, `Seller ${i + 1}: `];
    if (!s.name) fail(400, t[0] + 'নাম লিখুন', t[1] + 'enter a name');
    if (!validPhone(s.phone)) fail(400, t[0] + 'সঠিক মোবাইল নম্বর দিন', t[1] + 'enter a valid mobile number');
    if (seen.has(s.phone) || phoneTaken(s.phone)) fail(409, t[0] + 'এই নম্বর আগেই ব্যবহার হয়েছে', t[1] + 'this number is already used');
    if (!passOk(s.password)) fail(400, t[0] + PASS_MSG[0], t[1] + PASS_MSG[1]);
    seen.add(s.phone);
  });
  if (b.plan !== 'trial' && !METHODS.includes(b.payMethod)) b.payMethod = 'cash';
  otpGate(req, { purpose: 'biz-create', key: 'admin:' + admin.phone, phone: admin.phone, label: 'new shop account' });
  const bid = createBusiness({
    btype: req.btype,
    name, owner, place: str(b.place, 80), phone: validPhone(b.phone) ? b.phone : admin.phone, licence: str(b.licence, 40),
    opening: b.opening ? money(b.opening, { name: 'opening' }) : 0, cats, modules, starter: b.starter !== false, admin, sellers,
    plan: b.plan, payMethod: b.payMethod, payRef: str(b.payRef, 40), slug, vcond: b.vcond,
  });
  audit(req.user.id, 'business-create', bid + ' ' + name);
  notify(bid, `${brandOf(req.btype).bn}-য় স্বাগতম! আপনার আইডি: ${admin.phone}`, `Welcome to ${brandOf(req.btype).brand}! Your login ID is ${admin.phone}.`, `Welcome to ${brandOf(req.btype).brand}! Sign in at ${shopUrl(slug)} with ID ${admin.phone}.`);
  sellers.forEach((s) => require('../core').queueSms(s.phone, `${brandOf(req.btype).brand}: your seller ID ${s.phone} at ${name} is active. Get your password from the owner.`));
  unlockShop(req, bid);
  res.json({ id: bid, slug, url: shopUrl(slug) });
});

// Opening a shop's panel from the mother panel needs the super admin password again.
r.post('/unlock-shop', (req, res) => {
  const b = bizOr404(req.body.bid, req);
  const key = 'unlock:' + req.user.id;
  if (tooMany(key, 10, 15 * 60000)) fail(429, 'অনেকবার ভুল পাসওয়ার্ড। ১৫ মিনিট পরে চেষ্টা করুন।', 'Too many wrong passwords. Try again in 15 minutes.');
  if (!verifyPassword(String(req.body.password || '').trim(), req.user.pass_hash) && !verifyPassword(String(req.body.password || ''), req.user.pass_hash)) { addFail(key); fail(400, 'পাসওয়ার্ড ভুল', 'Wrong password'); }
  clearFails(key);
  unlockShop(req, b.id);
  audit(req.user.id, 'open-shop', String(b.id));
  res.json({ ok: true });
});

r.get('/slug-check', (req, res) => {
  const s = String(req.query.slug || '').toLowerCase();
  res.json({ ok: slugValid(s) && slugFree(s, Number(req.query.except)), valid: slugValid(s) });
});
r.put('/businesses/:id/slug', (req, res) => {
  const b = bizOr404(req.params.id, req);
  const s = String(req.body.slug || '').trim().toLowerCase();
  if (!slugValid(s)) fail(400, ...SLUG_MSG);
  if (!slugFree(s, b.id)) fail(409, 'এই ঠিকানা আগেই নেওয়া হয়েছে', 'This address is already taken');
  run('UPDATE businesses SET slug=? WHERE id=?', s, b.id);
  notify(b.id, `আপনার দোকানের নতুন ঠিকানা: ${shopUrl(s)}`, `Your shop’s new address: ${shopUrl(s)}`);
  audit(req.user.id, 'slug', `${b.id} ${s}`);
  res.json({ ok: true, url: shopUrl(s) });
});

// Bike shop: sells new bikes, used bikes or both.
r.put('/businesses/:id/vcond', (req, res) => {
  const b = bizOr404(req.params.id, req);
  if (b.btype !== 'bike') fail(400, 'শুধু বাইকের দোকানের জন্য', 'Only for bike shops');
  const v = ['new', 'old', 'both'].includes(req.body.vcond) ? req.body.vcond : fail(400, 'ধরন বাছাই করুন', 'Choose a type');
  run('UPDATE businesses SET vcond=? WHERE id=?', v, b.id);
  audit(req.user.id, 'vcond', `${b.id} ${v}`);
  res.json({ ok: true });
});

// Special price for one shop. Send empty values to go back to the standard price.
r.put('/businesses/:id/price', (req, res) => {
  const b = bizOr404(req.params.id, req);
  const val = (v) => (v === '' || v === null || v === undefined ? null : money(v, { name: 'price' }));
  const m = val(req.body.monthly), y = val(req.body.yearly);
  run('UPDATE businesses SET price_monthly=?, price_yearly=? WHERE id=?', m, y, b.id);
  audit(req.user.id, 'price', `${b.id} ${m}/${y}`);
  res.json(plansFor(get('SELECT * FROM businesses WHERE id=?', b.id)));
});

r.post('/businesses/:id/payment', (req, res) => {
  const b = bizOr404(req.params.id, req);
  const plan = req.body.plan === 'yearly' ? 'yearly' : 'monthly';
  const qty = Math.min(Math.max(parseInt(req.body.qty, 10) || 1, 1), 12);
  const P = plansFor(b);
  const amount = (plan === 'yearly' ? P.yearly : P.monthly) * qty;
  const base = b.expiry > today() ? b.expiry : today();
  let expiry = addMonths(base, plan === 'yearly' ? 12 * qty : qty);
  if (req.body.expiry) { if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.expiry) || req.body.expiry <= today()) fail(400, 'মেয়াদ আজকের পরের কোনো তারিখ হতে হবে', 'The expiry must be after today'); expiry = req.body.expiry; }
  const method = METHODS.includes(req.body.method) ? req.body.method : 'cash';
  tx(() => {
    run('INSERT INTO sub_payments(business_id,date,plan,qty,amount,method,ref) VALUES(?,?,?,?,?,?,?)', b.id, today(), plan, qty, amount, method, str(req.body.ref, 40));
    run("UPDATE businesses SET plan=?, expiry=?, status='on' WHERE id=?", plan, expiry, b.id);
  });
  notify(b.id, `৳ ${amount.toLocaleString('bn-BD')} পেমেন্ট পাওয়া গেছে। আপনার অ্যাকাউন্ট ${fmtDateBn(expiry)} পর্যন্ত চালু। ধন্যবাদ।`,
    `Payment of Tk ${amount} received. Your account is active until ${fmtDateEn(expiry)}. Thank you.`);
  audit(req.user.id, 'sub-payment', `${b.id} ${amount} ${expiry}`);
  res.json({ ok: true, expiry, amount });
});

r.post('/businesses/:id/expiry', (req, res) => {
  const b = bizOr404(req.params.id, req);
  const d = String(req.body.expiry || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= today()) fail(400, 'আজকের পরের কোনো তারিখ বাছাই করুন', 'Pick a date after today');
  run("UPDATE businesses SET expiry=?, status='on' WHERE id=?", d, b.id);
  notify(b.id, `আপনার ${brandOf(b.btype).bn} অ্যাকাউন্ট চালু আছে। মেয়াদ: ${fmtDateBn(d)} পর্যন্ত।`, `Your ${brandOf(b.btype).brand} account is active until ${fmtDateEn(d)}.`);
  audit(req.user.id, 'sub-expiry', `${b.id} ${d}`);
  res.json({ ok: true });
});

r.post('/businesses/:id/deactivate', (req, res) => {
  const b = bizOr404(req.params.id, req);
  run("UPDATE businesses SET status='off' WHERE id=?", b.id);
  notify(b.id, `আপনার ${brandOf(b.btype).bn} অ্যাকাউন্ট সাময়িকভাবে বন্ধ করা হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।`, `Your ${brandOf(b.btype).brand} account has been suspended. Please contact us for details.`);
  audit(req.user.id, 'deactivate', String(b.id));
  res.json({ ok: true });
});

// Erase a shop's records (sales, purchases, expenses, customers, dues, stock). Keeps one backup. OTP to the super admin.
r.post('/businesses/:id/reset', (req, res) => {
  const b = bizOr404(req.params.id, req);
  otpGate(req, { purpose: 'reset', key: 'biz:' + b.id, phone: req.user.phone, label: 'reset all data of ' + b.name.slice(0, 30) });
  tx(() => {
    const data = {
      products: all('SELECT * FROM products WHERE business_id=?', b.id), customers: all('SELECT * FROM customers WHERE business_id=?', b.id),
      vendors: all('SELECT * FROM vendors WHERE business_id=?', b.id), sales: all('SELECT * FROM sales WHERE business_id=?', b.id),
      sale_items: all('SELECT si.* FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.business_id=?', b.id),
      purchases: all('SELECT * FROM purchases WHERE business_id=?', b.id), expenses: all('SELECT * FROM expenses WHERE business_id=?', b.id),
      collections: all('SELECT * FROM collections WHERE business_id=?', b.id), vendor_payments: all('SELECT * FROM vendor_payments WHERE business_id=?', b.id),
      next_inv: b.next_inv,
    };
    run('INSERT INTO backups(business_id,data) VALUES(?,?) ON CONFLICT(business_id) DO UPDATE SET data=excluded.data, created_at=datetime(\'now\')', b.id, JSON.stringify(data));
    for (const t of ['sales', 'purchases', 'expenses', 'collections', 'vendor_payments', 'customers']) run(`DELETE FROM ${t} WHERE business_id=?`, b.id);
    run('UPDATE vendors SET due=0 WHERE business_id=?', b.id);
    run('UPDATE products SET stock=0 WHERE business_id=?', b.id);
    run('UPDATE businesses SET next_inv=1001 WHERE id=?', b.id);
  });
  notify(b.id, 'আপনার ব্যবসার সব হিসাবের ডেটা সুপার অ্যাডমিন রিসেট করেছেন।', 'All records of your shop were reset by the super admin.');
  audit(req.user.id, 'reset', String(b.id));
  res.json({ ok: true });
});

r.post('/businesses/:id/restore', (req, res) => {
  const b = bizOr404(req.params.id, req);
  const bk = get('SELECT data FROM backups WHERE business_id=?', b.id) || fail(404, 'কোনো ব্যাকআপ নেই', 'No backup');
  const d = JSON.parse(bk.data);
  tx(() => {
    for (const t of ['sales', 'purchases', 'expenses', 'collections', 'vendor_payments', 'customers', 'vendors', 'products']) run(`DELETE FROM ${t} WHERE business_id=?`, b.id);
    const ins = (table, rows) => rows.forEach((row) => { const k = Object.keys(row); run(`INSERT INTO ${table}(${k.join(',')}) VALUES(${k.map(() => '?').join(',')})`, ...k.map((x) => row[x])); });
    ins('products', d.products); ins('customers', d.customers); ins('vendors', d.vendors); ins('sales', d.sales); ins('sale_items', d.sale_items);
    ins('purchases', d.purchases); ins('expenses', d.expenses); ins('collections', d.collections); ins('vendor_payments', d.vendor_payments);
    run('UPDATE businesses SET next_inv=? WHERE id=?', d.next_inv, b.id);
    run('DELETE FROM backups WHERE business_id=?', b.id);
  });
  audit(req.user.id, 'restore', String(b.id));
  res.json({ ok: true });
});

r.put('/plans', (req, res) => {
  const m = money(req.body.monthly, { name: 'monthly' }), y = money(req.body.yearly, { name: 'yearly' }), t = Math.round(money(req.body.trialDays, { max: 365, name: 'trial' }));
  const k = (x) => (req.btype === 'agri' ? x : x + '_' + req.btype);
  setSetting(k('plan_monthly'), m); setSetting(k('plan_yearly'), y); setSetting(k('plan_trial_days'), t);
  if (req.body.payTo !== undefined) setSetting('pay_to', str(req.body.payTo, 40));
  if (req.body.whatsapp !== undefined) setSetting('whatsapp', str(req.body.whatsapp, 20).replace(/\D/g, ''));
  audit(req.user.id, 'plans', `${m}/${y}/${t}`);
  res.json(plans(req.btype));
});

// OTP on/off switch for the whole system.
r.put('/settings', (req, res) => {
  if (req.body.otp !== undefined) {
    setSetting('otp_enabled', req.body.otp ? '1' : '0');
    audit(req.user.id, 'otp-' + (req.body.otp ? 'on' : 'off'));
  }
  res.json({ otp: otpEnabled() });
});

r.get('/sms', (_req, res) => {
  res.json(all('SELECT id,phone,text,kind,status,tries,created_at,sent_at FROM sms ORDER BY id DESC LIMIT 150')
    .map((m) => ({ ...m, text: m.kind === 'otp' ? m.text.replace(/\d{6}/g, '••••••') : m.text })));
});

r.post('/sms/test', (req, res) => {
  const p = normPhone(req.body.phone || req.user.phone);
  if (!validPhone(p)) fail(400, 'সঠিক মোবাইল নম্বর দিন', 'Enter a valid mobile number');
  require('../core').queueSms(p, `${brandOf(req.btype).brand} test SMS: your SMS gateway is working.`);
  res.json({ ok: true });
});

r.get('/audit', (_req, res) => res.json(all('SELECT a.*, u.phone FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 200')));

module.exports = { router: r, isLocked };
