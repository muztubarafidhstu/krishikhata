'use strict';
const express = require('express');
const { get, all, run, tx, today } = require('../db');
const { hashPassword, encrypt, normPhone, validPhone, passOk } = require('../security');
const { requireLogin } = require('../auth');
const { fail, money, str, otpGate, audit, queueSms, isLocked, CATS, UNITS, EXP_TYPES } = require('../core');
const { bizState } = require('../state');
const { PASS_MSG } = require('./auth');

const r = express.Router();
r.use(requireLogin);

// Resolve which shop this request is for. Owners and sellers: their own shop. Super admin: ?bid= (acts as admin).
r.use((req, _res, next) => {
  const u = req.user;
  if (u.role === 'super') {
    const bid = Number(req.query.bid || req.body?.bid);
    req.biz = get('SELECT * FROM businesses WHERE id=?', bid) || fail(400, 'ব্যবসা বাছাই করুন', 'Choose a business');
    req.viewer = { role: 'admin', id: u.id, label: 'admin', isSuper: true };
  } else {
    req.biz = get('SELECT * FROM businesses WHERE id=?', u.business_id) || fail(403, 'অনুমতি নেই', 'Not allowed');
    req.viewer = { role: u.role, id: u.id, label: u.role === 'admin' ? 'admin' : u.seller_code };
  }
  // A locked shop (expired or switched off) can only read its state (billing screen) and notifications.
  const open = req.method === 'GET' || req.path === '/notes/read';
  if (!open && !req.viewer.isSuper && isLocked(req.biz)) fail(402, 'সাবস্ক্রিপশনের মেয়াদ শেষ বা অ্যাকাউন্ট বন্ধ।', 'Subscription expired or account switched off.', { locked: true });
  next();
});
const adminOnly = (req, _res, next) => { if (req.viewer.role !== 'admin') fail(403, 'শুধু মালিক / অ্যাডমিন এটি করতে পারেন', 'Only the owner / admin can do this'); next(); };
const bid = (req) => req.biz.id;

r.get('/state', (req, res) => res.json(bizState(bid(req), req.viewer)));

/* ---------- Sales ---------- */
r.post('/sales', (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  if (!items.length) fail(400, 'অন্তত একটি পণ্য যোগ করুন', 'Add at least one product');
  const out = tx(() => {
    const lines = items.map((it) => {
      const p = get('SELECT * FROM products WHERE id=? AND business_id=? AND active=1', Number(it.pid), bid(req)) || fail(400, 'পণ্য পাওয়া যায়নি', 'Product not found');
      const qty = money(it.qty, { min: 0.001, name: 'qty' });
      // Sellers always sell at the admin's price.
      const price = req.viewer.role === 'seller' ? p.sell : money(it.price, { name: 'price' });
      return { p, qty, price };
    });
    const need = new Map();
    for (const l of lines) need.set(l.p.id, (need.get(l.p.id) || 0) + l.qty);
    for (const l of lines) if (need.get(l.p.id) > l.p.stock + 1e-9) fail(409, `স্টকে যথেষ্ট নেই: ${l.p.name}`, `Not enough stock: ${l.p.name}`);
    const total = Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100;
    let cust = null;
    if (b.cust === 'new') {
      const name = str(b.newCustomer?.name, 60), phone = normPhone(b.newCustomer?.phone);
      if (!name) fail(400, 'নতুন ক্রেতার নাম লিখুন', 'Enter the customer’s name');
      if (!validPhone(phone)) fail(400, 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন', 'Enter a valid 11-digit mobile number');
      cust = get('SELECT * FROM customers WHERE business_id=? AND phone=?', bid(req), phone);
      if (!cust) {
        const id = Number(run('INSERT INTO customers(business_id,name,village,phone,due) VALUES(?,?,?,?,0)', bid(req), name, str(b.newCustomer?.village, 60) || '—', phone).lastInsertRowid);
        cust = get('SELECT * FROM customers WHERE id=?', id);
      }
    } else if (Number(b.cust) > 0) {
      cust = get('SELECT * FROM customers WHERE id=? AND business_id=?', Number(b.cust), bid(req)) || fail(400, 'ক্রেতা পাওয়া যায়নি', 'Customer not found');
    }
    const paid = b.paid === '' || b.paid === null || b.paid === undefined ? total : Math.min(money(b.paid, { name: 'paid' }), total);
    if (!cust && paid < total) fail(400, 'নগদ ক্রেতার জন্য পুরো টাকা নিতে হবে, অথবা ক্রেতা বাছাই করুন', 'Walk-in customers must pay in full — or pick a customer');
    const memo = get('SELECT next_inv FROM businesses WHERE id=?', bid(req)).next_inv;
    run('UPDATE businesses SET next_inv=next_inv+1 WHERE id=?', bid(req));
    const sid = Number(run('INSERT INTO sales(business_id,memo_no,date,customer_id,total,paid,seller_user_id,seller_label) VALUES(?,?,?,?,?,?,?,?)',
      bid(req), memo, today(), cust ? cust.id : null, total, paid, req.viewer.id, req.viewer.label).lastInsertRowid);
    for (const l of lines) {
      run('INSERT INTO sale_items(sale_id,product_id,qty,price,cost) VALUES(?,?,?,?,?)', sid, l.p.id, l.qty, l.price, l.p.buy);
      run('UPDATE products SET stock=stock-? WHERE id=?', l.qty, l.p.id);
    }
    if (cust && total > paid) run('UPDATE customers SET due=due+? WHERE id=?', total - paid, cust.id);
    return { memo, sid, cust: cust ? cust.id : 0 };
  });
  res.json(out);
});

// Cancel a sale: stock goes back, the customer's due is reversed.
r.post('/sales/:sid/void', adminOnly, (req, res) => {
  tx(() => {
    const s = get('SELECT * FROM sales WHERE id=? AND business_id=? AND void=0', Number(req.params.sid), bid(req)) || fail(404, 'মেমো পাওয়া যায়নি', 'Memo not found');
    for (const it of all('SELECT * FROM sale_items WHERE sale_id=?', s.id)) run('UPDATE products SET stock=stock+? WHERE id=?', it.qty, it.product_id);
    if (s.customer_id && s.total > s.paid) run('UPDATE customers SET due=MAX(0,due-?) WHERE id=?', s.total - s.paid, s.customer_id);
    run('UPDATE sales SET void=1 WHERE id=?', s.id);
    audit(req.user.id, 'sale-void', `${bid(req)} memo ${s.memo_no}`);
  });
  res.json({ ok: true });
});

/* ---------- Products ---------- */
function productFields(b) {
  const name = str(b.name, 80);
  if (!name) fail(400, 'পণ্যের নাম লিখুন', 'Enter a product name');
  if (!CATS.includes(b.cat)) fail(400, 'ক্যাটাগরি বাছাই করুন', 'Choose a category');
  if (!UNITS.includes(b.unit)) fail(400, 'একক বাছাই করুন', 'Choose a unit');
  return { name, cat: b.cat, unit: b.unit, buy: money(b.buy, { name: 'cost' }), sell: money(b.sell, { name: 'price' }), min: money(b.min || 0, { name: 'min' }), box: str(b.box, 20) };
}
r.post('/products', adminOnly, (req, res) => {
  const f = productFields(req.body);
  const id = Number(run('INSERT INTO products(business_id,name,cat,unit,buy,sell,stock,min_stock,box) VALUES(?,?,?,?,?,?,0,?,?)', bid(req), f.name, f.cat, f.unit, f.buy, f.sell, f.min, f.box).lastInsertRowid);
  res.json({ id });
});
r.put('/products/:id', adminOnly, (req, res) => {
  const f = productFields(req.body);
  const c = run('UPDATE products SET name=?,cat=?,unit=?,buy=?,sell=?,min_stock=?,box=? WHERE id=? AND business_id=?', f.name, f.cat, f.unit, f.buy, f.sell, f.min, f.box, Number(req.params.id), bid(req));
  if (!c.changes) fail(404, 'পণ্য পাওয়া যায়নি', 'Product not found');
  res.json({ ok: true });
});
r.post('/products/:id/remove', adminOnly, (req, res) => {
  run('UPDATE products SET active=0 WHERE id=? AND business_id=?', Number(req.params.id), bid(req));
  res.json({ ok: true });
});

/* ---------- Purchases & vendors ---------- */
r.post('/vendors', adminOnly, (req, res) => {
  const name = str(req.body.name, 80);
  if (!name) fail(400, 'ভেন্ডরের নাম লিখুন', 'Enter the vendor name');
  const phone = req.body.phone ? normPhone(req.body.phone) : '';
  if (phone && !validPhone(phone)) fail(400, 'সঠিক মোবাইল নম্বর দিন', 'Enter a valid mobile number');
  res.json({ id: Number(run('INSERT INTO vendors(business_id,name,phone,due) VALUES(?,?,?,0)', bid(req), name, phone).lastInsertRowid) });
});
r.post('/purchases', adminOnly, (req, res) => {
  const b = req.body;
  tx(() => {
    const v = get('SELECT * FROM vendors WHERE id=? AND business_id=?', Number(b.vendor), bid(req)) || fail(400, 'ভেন্ডর বাছাই করুন', 'Choose a vendor');
    const p = get('SELECT * FROM products WHERE id=? AND business_id=? AND active=1', Number(b.pid), bid(req)) || fail(400, 'পণ্য বাছাই করুন', 'Choose a product');
    const qty = money(b.qty, { min: 0.001, name: 'qty' }), rate = money(b.rate, { name: 'rate' });
    const total = Math.round(qty * rate * 100) / 100, paid = Math.min(money(b.paid || 0, { name: 'paid' }), total);
    run('INSERT INTO purchases(business_id,date,vendor_id,product_id,qty,rate,total,paid) VALUES(?,?,?,?,?,?,?,?)', bid(req), today(), v.id, p.id, qty, rate, total, paid);
    run('UPDATE products SET stock=stock+?, buy=? WHERE id=?', qty, rate, p.id);
    if (total > paid) run('UPDATE vendors SET due=due+? WHERE id=?', total - paid, v.id);
  });
  res.json({ ok: true });
});

/* ---------- Dues ---------- */
r.post('/customers/:id/collect', adminOnly, (req, res) => {
  tx(() => {
    const c = get('SELECT * FROM customers WHERE id=? AND business_id=?', Number(req.params.id), bid(req)) || fail(404, 'ক্রেতা পাওয়া যায়নি', 'Customer not found');
    const amt = Math.min(money(req.body.amount, { min: 0.01, name: 'amount' }), c.due);
    if (amt <= 0) fail(400, 'এই ক্রেতার কোনো বাকি নেই', 'This customer has no due');
    run('UPDATE customers SET due=due-? WHERE id=?', amt, c.id);
    run('INSERT INTO collections(business_id,date,customer_id,amount) VALUES(?,?,?,?)', bid(req), today(), c.id, amt);
  });
  res.json({ ok: true });
});
r.put('/customers/:id', adminOnly, (req, res) => {
  const name = str(req.body.name, 60), phone = normPhone(req.body.phone);
  if (!name || !validPhone(phone)) fail(400, 'নাম ও সঠিক মোবাইল নম্বর দিন', 'Enter a name and a valid mobile number');
  run('UPDATE customers SET name=?, village=?, phone=? WHERE id=? AND business_id=?', name, str(req.body.village, 60), phone, Number(req.params.id), bid(req));
  res.json({ ok: true });
});
r.post('/vendors/:id/pay', adminOnly, (req, res) => {
  tx(() => {
    const v = get('SELECT * FROM vendors WHERE id=? AND business_id=?', Number(req.params.id), bid(req)) || fail(404, 'ভেন্ডর পাওয়া যায়নি', 'Vendor not found');
    const amt = Math.min(money(req.body.amount, { min: 0.01, name: 'amount' }), v.due);
    if (amt <= 0) fail(400, 'এই ভেন্ডরের কোনো দেনা নেই', 'Nothing is owed to this vendor');
    run('UPDATE vendors SET due=due-? WHERE id=?', amt, v.id);
    run('INSERT INTO vendor_payments(business_id,date,vendor_id,amount) VALUES(?,?,?,?)', bid(req), today(), v.id, amt);
  });
  res.json({ ok: true });
});

/* ---------- Expenses ---------- */
r.post('/expenses', adminOnly, (req, res) => {
  const type = EXP_TYPES.includes(req.body.type) ? req.body.type : 'other';
  run('INSERT INTO expenses(business_id,date,type,amount,note) VALUES(?,?,?,?,?)', bid(req), today(), type, money(req.body.amount, { min: 0.01, name: 'amount' }), str(req.body.note, 120));
  res.json({ ok: true });
});

/* ---------- Opening cash ---------- */
r.put('/opening', adminOnly, (req, res) => {
  run('UPDATE businesses SET opening=? WHERE id=?', money(req.body.opening, { min: -1e10, name: 'opening' }), bid(req));
  res.json({ ok: true });
});

/* ---------- Sellers (max 3) ---------- */
r.post('/sellers', adminOnly, (req, res) => {
  const name = str(req.body.name, 60), phone = normPhone(req.body.phone), pw = String(req.body.password || '');
  if (!name) fail(400, 'সেলারের নাম লিখুন', 'Enter the seller’s name');
  if (!validPhone(phone)) fail(400, 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (01XXXXXXXXX)', 'Enter a valid 11-digit mobile number (01XXXXXXXXX)');
  if (get('SELECT 1 x FROM users WHERE phone=?', phone)) fail(409, 'এই নম্বরে আগে থেকেই একটি আইডি আছে', 'This number already has an ID');
  if (!passOk(pw)) fail(400, ...PASS_MSG);
  const used = all("SELECT seller_code c FROM users WHERE business_id=? AND role='seller' AND active=1", bid(req)).map((x) => x.c);
  const code = ['S-01', 'S-02', 'S-03'].find((c) => !used.includes(c));
  if (!code) fail(400, 'সর্বোচ্চ ৩ জন সেলার রাখা যায়', 'A shop can have at most 3 sellers');
  otpGate(req, { purpose: 'seller-add', key: `${bid(req)}:${phone}`, phone, label: 'new seller ID' });
  run("DELETE FROM users WHERE phone=? AND active=0", phone);
  run('INSERT INTO users(business_id,role,name,phone,pass_hash,pass_enc,seller_code) VALUES(?,?,?,?,?,?,?)', bid(req), 'seller', name, phone, hashPassword(pw), encrypt(pw), code);
  queueSms(phone, `KrishiKhata: your seller ID ${phone} at ${req.biz.name.slice(0, 40)} is active.`);
  audit(req.user.id, 'seller-add', `${bid(req)} ${phone}`);
  res.json({ ok: true, code });
});
r.post('/sellers/:uid/remove', adminOnly, (req, res) => {
  const c = run("UPDATE users SET active=0 WHERE id=? AND business_id=? AND role='seller'", Number(req.params.uid), bid(req));
  if (!c.changes) fail(404, 'সেলার পাওয়া যায়নি', 'Seller not found');
  run('DELETE FROM sessions WHERE user_id=?', Number(req.params.uid));
  audit(req.user.id, 'seller-remove', `${bid(req)} ${req.params.uid}`);
  res.json({ ok: true });
});
// Owner sets a seller's password. OTP goes to the seller's phone.
r.post('/sellers/:uid/password', adminOnly, (req, res) => {
  const u = get("SELECT * FROM users WHERE id=? AND business_id=? AND role='seller' AND active=1", Number(req.params.uid), bid(req)) || fail(404, 'সেলার পাওয়া যায়নি', 'Seller not found');
  const pw = String(req.body.password || '');
  if (!passOk(pw)) fail(400, ...PASS_MSG);
  otpGate(req, { purpose: 'pw', key: 'seller:' + u.id, phone: u.phone, label: 'password change' });
  run('UPDATE users SET pass_hash=?, pass_enc=? WHERE id=?', hashPassword(pw), encrypt(pw), u.id);
  run('DELETE FROM sessions WHERE user_id=?', u.id);
  audit(req.user.id, 'password-seller', String(u.id));
  res.json({ ok: true });
});

r.post('/notes/read', (req, res) => { run('UPDATE notifications SET read=1 WHERE business_id=?', bid(req)); res.json({ ok: true }); });

module.exports = { router: r };
