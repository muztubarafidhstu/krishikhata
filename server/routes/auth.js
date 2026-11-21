'use strict';
const express = require('express');
const { get, run } = require('../db');
const { verifyPassword, hashPassword, encrypt, normPhone, validPhone, passOk } = require('../security');
const { createSession, destroySession, requireLogin, limit } = require('../auth');
const { fail, otpGate, otpEnabled, audit, queueSms } = require('../core');

const r = express.Router();
const PASS_MSG = ['পাসওয়ার্ডে কমপক্ষে ৫ অক্ষর, একটি ইংরেজি অক্ষর, একটি সংখ্যা ও একটি চিহ্ন লাগবে', 'The password needs 5+ characters with a letter, a number and a symbol'];

const meOf = (u) => ({ id: u.id, role: u.role, name: u.name, phone: u.phone, businessId: u.business_id, sellerCode: u.seller_code });

r.post('/login', (req, res) => {
  const phone = normPhone(req.body.phone);
  const ip = req.ip;
  if (!limit('login:' + ip, 30, 15 * 60000) || !limit('login:' + phone, 8, 15 * 60000))
    fail(429, 'অনেকবার ভুল চেষ্টা হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।', 'Too many attempts. Try again in 15 minutes.');
  const u = get('SELECT * FROM users WHERE phone=? AND active=1', phone);
  if (!u || !verifyPassword(String(req.body.password || ''), u.pass_hash)) fail(401, 'মোবাইল নম্বর বা পাসওয়ার্ড ভুল', 'Wrong mobile number or password', { login: true });
  createSession(res, req, u.id);
  audit(u.id, 'login');
  res.json({ me: meOf(u), otp: otpEnabled() });
});

r.post('/logout', (req, res) => { destroySession(req, res); res.json({ ok: true }); });

r.get('/me', requireLogin, (req, res) => res.json({ me: meOf(req.user), otp: otpEnabled() }));

// Change own password. OTP goes to the user's own phone (when OTP is on).
r.post('/password', requireLogin, (req, res) => {
  const pw = String(req.body.password || '');
  if (!passOk(pw)) fail(400, ...PASS_MSG);
  if (!verifyPassword(String(req.body.current || ''), req.user.pass_hash)) fail(400, 'বর্তমান পাসওয়ার্ড ভুল', 'Current password is wrong');
  otpGate(req, { purpose: 'pw', key: 'self:' + req.user.id, phone: req.user.phone, label: 'password change' });
  run('UPDATE users SET pass_hash=?, pass_enc=? WHERE id=?', hashPassword(pw), encrypt(pw), req.user.id);
  queueSms(req.user.phone, 'Your KrishiKhata password was changed. If this was not you, contact us now.');
  audit(req.user.id, 'password-self');
  res.json({ ok: true });
});

// Forgot password — only possible while OTP is switched on (otherwise anyone could reset by phone number).
r.post('/forgot', (req, res) => {
  if (!otpEnabled()) fail(403, 'OTP বন্ধ আছে। পাসওয়ার্ড বদলাতে দোকানের মালিক বা সুপার অ্যাডমিনকে বলুন।', 'OTP is switched off. Ask the shop owner or super admin to reset your password.');
  const phone = normPhone(req.body.phone);
  if (!validPhone(phone)) fail(400, 'সঠিক মোবাইল নম্বর দিন', 'Enter a valid mobile number');
  if (!limit('forgot:' + req.ip, 10, 3600000)) fail(429, 'পরে চেষ্টা করুন', 'Try again later');
  const u = get('SELECT * FROM users WHERE phone=? AND active=1', phone);
  if (!u) fail(404, 'এই নম্বরে কোনো অ্যাকাউন্ট নেই', 'No account uses this number');
  const pw = String(req.body.password || '');
  if (!passOk(pw)) fail(400, ...PASS_MSG);
  otpGate(req, { purpose: 'forgot', key: 'forgot:' + u.id, phone, label: 'password reset' });
  run('UPDATE users SET pass_hash=?, pass_enc=? WHERE id=?', hashPassword(pw), encrypt(pw), u.id);
  run('DELETE FROM sessions WHERE user_id=?', u.id);
  audit(u.id, 'password-forgot');
  res.json({ ok: true });
});

module.exports = { router: r, meOf, PASS_MSG };
