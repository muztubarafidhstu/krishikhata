'use strict';
// Background jobs: expiry reminders (hourly), nightly database backup, cleanup.
const fs = require('node:fs');
const path = require('node:path');
const { db, all, run, today, daysBetween, getSetting, setSetting } = require('./db');
const { DATA_DIR, BACKUP_KEEP_DAYS } = require('./config');
const { notify, brandOf } = require('./core');

const fmtBn = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtEn = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function reminders() {
  for (const b of all("SELECT * FROM businesses WHERE status='on'")) {
    const dl = daysBetween(today(), b.expiry);
    let k = null;
    if (dl < 0) k = 'x'; else if (dl <= 1) k = '1'; else if (dl <= 3) k = '3'; else if (dl <= 7) k = '7';
    if (!k) continue;
    const key = b.expiry + ':' + k;
    const r = run('INSERT OR IGNORE INTO reminders(business_id,key) VALUES(?,?)', b.id, key);
    if (!r.changes) continue;
    if (k === 'x') notify(b.id, `আপনার সাবস্ক্রিপশনের মেয়াদ ${fmtBn(b.expiry)} শেষ হয়েছে। অ্যাকাউন্ট বন্ধ আছে, নবায়ন করুন।`,
      `Your subscription ended on ${fmtEn(b.expiry)}. The account is locked - please renew.`, `${brandOf(b.btype).brand}: your subscription ended on ${fmtEn(b.expiry)}. Please renew to unlock your account.`);
    else notify(b.id, `আপনার সাবস্ক্রিপশন ${dl.toLocaleString('bn-BD')} দিন পর (${fmtBn(b.expiry)}) শেষ হবে। সময়মতো নবায়ন করুন।`,
      `Your subscription ends in ${dl} days (${fmtEn(b.expiry)}). Please renew in time.`, `${brandOf(b.btype).brand}: your subscription ends in ${dl} day(s) on ${fmtEn(b.expiry)}. Please renew.`);
  }
}

function backup() {
  const dir = path.join(DATA_DIR, 'backups');
  const file = path.join(dir, `krishikhata-${today()}.db`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const cutoff = Date.now() - BACKUP_KEEP_DAYS * 86400000;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f.startsWith('krishikhata-') && fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p);
  }
  return file;
}

function cleanup() {
  run('DELETE FROM sessions WHERE expires_at<?', Date.now());
  run('DELETE FROM otps WHERE created_at<?', Date.now() - 86400000);
  run('DELETE FROM sms WHERE created_at<?', Date.now() - 90 * 86400000);
}

function start() {
  const safe = (fn, name) => () => { try { fn(); } catch (e) { console.error('[job]', name, e); } };
  safe(reminders, 'reminders')(); safe(cleanup, 'cleanup')();
  setInterval(safe(reminders, 'reminders'), 3600000).unref();
  setInterval(safe(cleanup, 'cleanup'), 6 * 3600000).unref();
  // Back up once a day (checked hourly) — the file name carries the date.
  const daily = safe(() => { const f = path.join(DATA_DIR, 'backups', `krishikhata-${today()}.db`); if (!fs.existsSync(f)) console.log('[backup]', backup()); }, 'backup');
  daily(); setInterval(daily, 3600000).unref();
  // The official demo shops start fresh once a day, at 3 at night Bangladesh time (anyone can open them with one tap).
  const demoReset = safe(() => {
    const bdHour = new Date(Date.now() + 6 * 3600000).getUTCHours();
    const key = 'demo_reset_' + today();
    if (bdHour !== 3 || getSetting(key, '')) return;
    setSetting(key, '1');
    run("DELETE FROM settings WHERE key LIKE 'demo_reset_%' AND key<>?", key);
    const done = require('./demo').resetDemos();
    if (done.length) console.log('[demo] fresh sample data:', done.join(', '));
  }, 'demo-reset');
  setInterval(demoReset, 15 * 60000).unref();
}

module.exports = { start, backup, reminders };
