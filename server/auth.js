'use strict';
const { get, run } = require('./db');
const { sha256, token } = require('./security');
const { COOKIE_SECURE } = require('./config');
const { fail } = require('./core');

const COOKIE = 'kk_sid';
const SESSION_DAYS = 14;
const IDLE_MS = 12 * 3600 * 1000; // sign out after 12 hours without activity

function parseCookies(h = '') {
  const out = {};
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function cookieStr(val, maxAgeSec, req) {
  const secure = COOKIE_SECURE || req.secure ? '; Secure' : '';
  return `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}
function createSession(res, req, userId) {
  const t = token();
  run('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)', sha256(t), userId, Date.now() + IDLE_MS, Date.now());
  res.setHeader('Set-Cookie', cookieStr(t, SESSION_DAYS * 86400, req));
}
function destroySession(req, res) {
  const t = parseCookies(req.headers.cookie)[COOKIE];
  if (t) run('DELETE FROM sessions WHERE token_hash=?', sha256(t));
  res.setHeader('Set-Cookie', cookieStr('', 0, req));
}

// Loads req.user when a valid session cookie is present.
function loadUser(req, _res, next) {
  req.user = null;
  const t = parseCookies(req.headers.cookie)[COOKIE];
  if (t) {
    const h = sha256(t);
    const s = get('SELECT * FROM sessions WHERE token_hash=?', h);
    if (s && s.expires_at > Date.now()) {
      const u = get('SELECT * FROM users WHERE id=? AND active=1', s.user_id);
      if (u) { req.user = u; run('UPDATE sessions SET expires_at=? WHERE token_hash=?', Date.now() + IDLE_MS, h); }
    } else if (s) run('DELETE FROM sessions WHERE token_hash=?', h);
  }
  next();
}
const requireLogin = (req, _res, next) => { if (!req.user) fail(401, 'আবার লগইন করুন', 'Please sign in again'); next(); };
const requireSuper = (req, _res, next) => { if (!req.user || req.user.role !== 'super') fail(403, 'অনুমতি নেই', 'Not allowed'); next(); };

// Mutating requests must carry X-KK: 1 — browsers cannot add it on cross-site form posts (CSRF protection).
function csrf(req, _res, next) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.path.startsWith('/api/gateway') && req.get('X-KK') !== '1') fail(403, 'অনুমতি নেই', 'Forbidden');
  next();
}

// Simple in-memory rate limiter.
const hits = new Map();
function limit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  return arr.length <= max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600000)) hits.delete(k); }, 600000).unref();

module.exports = { createSession, destroySession, loadUser, requireLogin, requireSuper, csrf, limit };
