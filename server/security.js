'use strict';
const crypto = require('node:crypto');
const { APP_SECRET } = require('./config');

const KEY = crypto.createHash('sha256').update('kk-enc:' + APP_SECRET).digest();

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const hash = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 32, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(hashHex, 'hex');
  return want.length === hash.length && crypto.timingSafeEqual(want, hash);
}
// Reversible copy so the super admin can view a password (owner's requirement). AES-256-GCM.
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}
function decrypt(blob) {
  try {
    const [iv, tag, enc] = String(blob).split('.').map((s) => Buffer.from(s, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch { return null; }
}
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const hmac = (s) => crypto.createHmac('sha256', APP_SECRET).update(String(s)).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');

const BN = '০১২৩৪৫৬৭৮৯';
const toAscii = (s) => String(s ?? '').replace(/[০-৯]/g, (d) => BN.indexOf(d));
const normPhone = (s) => toAscii(s).replace(/\D/g, '').slice(-11);
const validPhone = (s) => /^01[3-9]\d{8}$/.test(normPhone(s));
const passOk = (p) => typeof p === 'string' && p.length >= 5 && p.length <= 64 && /[A-Za-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9\s]/.test(p);
const maskPhone = (p) => { const d = normPhone(p); return d.length === 11 ? d.slice(0, 3) + '****' + d.slice(7) : d; };

module.exports = { hashPassword, verifyPassword, encrypt, decrypt, sha256, hmac, token, toAscii, normPhone, validPhone, passOk, maskPhone };
