'use strict';
const { get, run } = require('./db');
const { sha256, token } = require('./security');
const { COOKIE_SECURE } = require('./config');
const { fail } = require('./core');

const COOKIE = 'kk_sid';
const SESSION_DAYS = 14;
const IDLE_MS = 12 * 3600 * 1000; // sign out after 12 hours without activity
const REMEMBER_MS = 30 * 86400 * 1000; // "Remember me": stay signed in for 30 days
const SUPER_IDLE_MS = 30 * 60 * 1000; // mother panel: signed out after 30 minutes without activity
const UNLOCK_MS = 30 * 60 * 1000; // super admin's access to one shop panel after re-entering the password

function parseCookies(h = '') {
  const out = {};
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
// maxAgeSec === null makes a browser-session cookie (gone when the browser is closed).
function cookieStr(val, maxAgeSec, req) {
  const secure = COOKIE_SECURE || req.secure ? '; Secure' : '';
  return `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Lax${maxAgeSec === null ? '' : `; Max-Age=${maxAgeSec}`}${secure}`;
}
function createSession(res, req, user, remember) {
  const isSuper = user.role === 'super';
  const ttl = isSuper ? SUPER_IDLE_MS : remember ? REMEMBER_MS : IDLE_MS;
  const t = token();
  run('INSERT INTO sessions(token_hash,user_id,expires_at,created_at,ttl) VALUES(?,?,?,?,?)', sha256(t), user.id, Date.now() + ttl, Date.now(), ttl);
  res.setHeader('Set-Cookie', cookieStr(t, isSuper ? null : Math.max(SESSION_DAYS * 86400, ttl / 1000), req));
}
// Super admin re-entered the password to open one shop's panel.
function unlockShop(req, bid) { run('UPDATE sessions SET unlock_bid=?, unlock_until=? WHERE token_hash=?', bid, Date.now() + UNLOCK_MS, req.session.token_hash); }
function shopUnlocked(req, bid) {
  const s = req.session;
  if (!s || s.unlock_bid !== bid || !(s.unlock_until > Date.now())) return false;
  run('UPDATE sessions SET unlock_until=? WHERE token_hash=?', Date.now() + UNLOCK_MS, s.token_hash);
  return true;
}
function destroySession(req, res) {
  const t = parseCookies(req.headers.cookie)[COOKIE];
  if (t) run('DELETE FROM sessions WHERE token_hash=?', sha256(t));
  res.setHeader('Set-Cookie', cookieStr('', 0, req));
}

// Loads req.user when a valid session cookie is present.
function loadUser(req, _res, next) {
  req.user = null;
  req.session = null;
  const t = parseCookies(req.headers.cookie)[COOKIE];
  if (t) {
    const h = sha256(t);
    const s = get('SELECT * FROM sessions WHERE token_hash=?', h);
    if (s && s.expires_at > Date.now()) {
      const u = get('SELECT * FROM users WHERE id=? AND active=1', s.user_id);
      if (u) { req.user = u; req.session = s; run('UPDATE sessions SET expires_at=? WHERE token_hash=?', Date.now() + (s.ttl || IDLE_MS), h); }
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

module.exports = { createSession, unlockShop, shopUnlocked, destroySession, loadUser, requireLogin, requireSuper, csrf, limit };
