'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Load .env from the project root if present (simple KEY=VALUE parser, no dependency).
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
fs.mkdirSync(path.join(DATA_DIR, 'backups'), { recursive: true });

// APP_SECRET encrypts stored passwords and signs OTP hashes. Keep it safe and never change it.
let secret = process.env.APP_SECRET || '';
if (secret.length < 32) {
  const keyFile = path.join(DATA_DIR, 'secret.key');
  if (fs.existsSync(keyFile)) secret = fs.readFileSync(keyFile, 'utf8').trim();
  else {
    secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(keyFile, secret, { mode: 0o600 });
    console.warn('[config] APP_SECRET not set — generated one in', keyFile, '(copy it into .env for production)');
  }
}

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  DATA_DIR,
  APP_SECRET: secret,
  COOKIE_SECURE: process.env.COOKIE_SECURE === '1',
  GATEWAY_KEY: process.env.GATEWAY_KEY || '',
  DOMAIN: (process.env.DOMAIN || '').toLowerCase(),
  ADMIN_DOMAIN: (process.env.ADMIN_DOMAIN || '').toLowerCase(), // mother panel for agricultural shops (KrishiKhata)
  BUILD_ADMIN_DOMAIN: (process.env.BUILD_ADMIN_DOMAIN || '').toLowerCase(), // mother panel for building-material shops (NirmanKhata)
  SUPER_PHONE: process.env.SUPER_PHONE || '',
  SUPER_PASSWORD: process.env.SUPER_PASSWORD || '',
  SUPER_NAME: process.env.SUPER_NAME || 'Super Admin',
  BACKUP_KEEP_DAYS: Number(process.env.BACKUP_KEEP_DAYS || 30),
  TZ_OFFSET_MIN: 360, // Bangladesh, UTC+6, no daylight saving
};
