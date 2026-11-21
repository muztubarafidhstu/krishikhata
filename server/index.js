'use strict';
const { PORT, SUPER_PHONE, SUPER_PASSWORD, SUPER_NAME } = require('./config');
const { get, getSetting, setSetting } = require('./db');
const { validPhone, passOk } = require('./security');
const { addUser } = require('./business');
const { createApp } = require('./app');
const jobs = require('./jobs');

// First start: create the super admin from .env.
if (!get("SELECT 1 x FROM users WHERE role='super'")) {
  if (!validPhone(SUPER_PHONE) || !passOk(SUPER_PASSWORD)) {
    console.error('\n[setup] Set SUPER_PHONE (11 digits) and SUPER_PASSWORD (5+ chars with a letter, a number and a symbol) in .env, then start again.\n');
    process.exit(1);
  }
  addUser({ bid: null, role: 'super', name: SUPER_NAME, phone: SUPER_PHONE, password: SUPER_PASSWORD });
  if (!getSetting('pay_to')) setSetting('pay_to', SUPER_PHONE);
  console.log('[setup] Super admin created:', SUPER_PHONE);
}
if (!getSetting('otp_enabled')) setSetting('otp_enabled', '0'); // OTP starts OFF until the SMS gateway is ready.

createApp().listen(PORT, () => console.log(`[krishikhata] listening on :${PORT}`));
jobs.start();
