'use strict';
// API for the ESP32 + SIM800L SMS gateway. Authenticated with the GATEWAY_KEY header.
const express = require('express');
const crypto = require('node:crypto');
const { all, run, get, setSetting } = require('../db');
const { GATEWAY_KEY } = require('../config');
const { fail } = require('../core');

const r = express.Router();
r.use((req, _res, next) => {
  const k = String(req.get('X-Gateway-Key') || '');
  const ok = GATEWAY_KEY.length >= 16 && k.length === GATEWAY_KEY.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(GATEWAY_KEY));
  if (!ok) fail(401, 'gateway key ভুল', 'Bad gateway key');
  setSetting('gateway_last_seen', Date.now());
  next();
});

// Next messages to send. OTPs first. A message picked more than 2 minutes ago without a result is offered again.
r.get('/pending', (req, res) => {
  const lim = Math.min(Number(req.query.limit) || 3, 10);
  const now = Date.now();
  const rows = all(`SELECT id,phone,text FROM sms WHERE (status='pending' OR (status='sending' AND picked_at<?)) AND tries<3
    ORDER BY CASE kind WHEN 'otp' THEN 0 ELSE 1 END, id LIMIT ?`, now - 120000, lim);
  for (const m of rows) run("UPDATE sms SET status='sending', picked_at=?, tries=tries+1 WHERE id=?", now, m.id);
  // Old unsent OTPs are useless — drop them.
  run("UPDATE sms SET status='expired' WHERE kind='otp' AND status IN ('pending','sending') AND created_at<?", now - 10 * 60000);
  res.json(rows.map((m) => ({ id: m.id, to: '+88' + m.phone, text: m.text })));
});

r.post('/result', express.json(), (req, res) => {
  const id = Number(req.body.id);
  const m = get('SELECT * FROM sms WHERE id=?', id) || fail(404, 'নেই', 'Not found');
  if (req.body.ok) run("UPDATE sms SET status='sent', sent_at=? WHERE id=?", Date.now(), id);
  else run("UPDATE sms SET status=? WHERE id=?", m.tries >= 3 ? 'failed' : 'pending', id);
  res.json({ ok: true });
});

module.exports = { router: r };
