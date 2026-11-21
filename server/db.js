'use strict';
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { DATA_DIR, TZ_OFFSET_MIN } = require('./config');

const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'krishikhata.db');
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, owner TEXT NOT NULL, place TEXT DEFAULT '', phone TEXT DEFAULT '',
  licence TEXT DEFAULT '', slug TEXT UNIQUE NOT NULL, cats TEXT NOT NULL, modules TEXT NOT NULL,
  opening REAL DEFAULT 0, next_inv INTEGER DEFAULT 1001,
  plan TEXT DEFAULT 'trial', status TEXT DEFAULT 'on', sub_start TEXT, expiry TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super','admin','seller')), name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL, pass_enc TEXT NOT NULL, seller_code TEXT, active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, cat TEXT NOT NULL, unit TEXT NOT NULL, buy REAL DEFAULT 0, sell REAL DEFAULT 0,
  stock REAL DEFAULT 0, min_stock REAL DEFAULT 0, box TEXT DEFAULT '', active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, village TEXT DEFAULT '', phone TEXT DEFAULT '', due REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, phone TEXT DEFAULT '', due REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  memo_no INTEGER NOT NULL, date TEXT NOT NULL, customer_id INTEGER, total REAL NOT NULL, paid REAL NOT NULL,
  seller_user_id INTEGER, seller_label TEXT NOT NULL, void INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY, sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL, qty REAL NOT NULL, price REAL NOT NULL, cost REAL NOT NULL);
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date TEXT NOT NULL, vendor_id INTEGER NOT NULL, product_id INTEGER NOT NULL, qty REAL NOT NULL, rate REAL NOT NULL,
  total REAL NOT NULL, paid REAL NOT NULL);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, note TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date TEXT NOT NULL, customer_id INTEGER NOT NULL, amount REAL NOT NULL);
CREATE TABLE IF NOT EXISTS vendor_payments (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date TEXT NOT NULL, vendor_id INTEGER NOT NULL, amount REAL NOT NULL);
CREATE TABLE IF NOT EXISTS sub_payments (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date TEXT NOT NULL, plan TEXT NOT NULL, qty INTEGER NOT NULL, amount REAL NOT NULL, method TEXT NOT NULL, ref TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date TEXT NOT NULL, text_bn TEXT NOT NULL, text_en TEXT NOT NULL, read INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS reminders (business_id INTEGER NOT NULL, key TEXT NOT NULL, PRIMARY KEY (business_id, key));
CREATE TABLE IF NOT EXISTS sms (
  id INTEGER PRIMARY KEY, phone TEXT NOT NULL, text TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'pending', tries INTEGER DEFAULT 0, picked_at INTEGER, sent_at INTEGER,
  created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY, purpose TEXT NOT NULL, key TEXT NOT NULL, phone TEXT NOT NULL, code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL, tries INTEGER DEFAULT 0, used INTEGER DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS backups (business_id INTEGER PRIMARY KEY, data TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, detail TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS ix_products_b ON products(business_id);
CREATE INDEX IF NOT EXISTS ix_customers_b ON customers(business_id);
CREATE INDEX IF NOT EXISTS ix_sales_b ON sales(business_id, date);
CREATE INDEX IF NOT EXISTS ix_items_s ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS ix_sms_status ON sms(status, created_at);
CREATE INDEX IF NOT EXISTS ix_notif_b ON notifications(business_id);
`);

// node:sqlite does not accept undefined — convert to null.
const clean = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
const get = (sql, ...p) => db.prepare(sql).get(...clean(p));
const all = (sql, ...p) => db.prepare(sql).all(...clean(p));
const run = (sql, ...p) => db.prepare(sql).run(...clean(p));

let depth = 0;
function tx(fn) {
  if (depth > 0) return fn();
  depth++;
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
  finally { depth--; }
}

const getSetting = (k, d = '') => { const r = get('SELECT value FROM settings WHERE key=?', k); return r ? r.value : d; };
const setSetting = (k, v) => run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, String(v));

// Dates are kept as YYYY-MM-DD in Bangladesh time.
const today = (offsetDays = 0) => new Date(Date.now() + TZ_OFFSET_MIN * 60000 + offsetDays * 86400000).toISOString().slice(0, 10);
function addMonths(ds, n) { const d = new Date(ds + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); }
function addDays(ds, n) { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);

module.exports = { db, DB_FILE, get, all, run, tx, getSetting, setSetting, today, addMonths, addDays, daysBetween };
