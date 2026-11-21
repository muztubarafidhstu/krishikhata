'use strict';
const path = require('node:path');
const express = require('express');
const { get, all } = require('./db');
const { loadUser, csrf } = require('./auth');
const { HttpError, isLocked } = require('./core');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback, uniquelocal'); // behind Caddy

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    next();
  });
  app.use(express.json({ limit: '200kb' }));
  app.use(loadUser);
  app.use(csrf);

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: Date.now() }));
  app.use('/api', require('./routes/auth').router);
  app.use('/api/super', require('./routes/super').router);
  app.use('/api/biz', require('./routes/biz').router);
  app.use('/api/gateway', require('./routes/gateway').router);

  // Public product page for farmers: /shop/<slug>
  app.get('/api/public/shop/:slug', (req, res) => {
    const b = get('SELECT * FROM businesses WHERE slug=?', String(req.params.slug));
    if (!b || isLocked(b) || !JSON.parse(b.modules).includes('shop')) return res.status(404).json({ error: 'দোকান পাওয়া যায়নি', error_en: 'Shop not found' });
    res.json({
      name: b.name, place: b.place, phone: b.phone, cats: JSON.parse(b.cats), btype: b.btype || 'agri',
      products: all('SELECT id,name,cat,unit,sell,brand,size,dims,stock>0 inStock FROM products WHERE business_id=? AND active=1 ORDER BY cat,id', b.id),
    });
  });

  app.use('/vendor/html2canvas.min.js', (_req, res) => res.sendFile(require.resolve('html2canvas/dist/html2canvas.min.js')));
  app.use('/vendor/jspdf.umd.min.js', (_req, res) => res.sendFile(require.resolve('jspdf/dist/jspdf.umd.min.js')));
  app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '1h' }));
  // Shareable app page: /app (download, short ad, demo logins, how-to)
  const fs = require('node:fs');
  const TPL = {
    agri: fs.readFileSync(path.join(__dirname, 'views', 'download.html'), 'utf8'),
    build: fs.readFileSync(path.join(__dirname, 'views', 'download-build.html'), 'utf8'),
  };
  const { DOMAIN } = require('./config');
  const { getSetting } = require('./db');
  const WA_ICON = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8.9 3.8.8a3.3 3.3 0 0 0 2.2-1.5 2.7 2.7 0 0 0 .2-1.5c-.1-.2-.3-.3-.6-.4z"/></svg>';
  // /app = KrishiKhata sales page, /nirman = NirmanKhata sales page
  app.get(['/app', '/download', '/nirman'], (req, res) => {
    const type = req.path === '/nirman' ? 'build' : 'agri';
    const bname = type === 'build' ? 'নির্মাণখাতা' : 'কৃষিখাতা';
    const host = DOMAIN || req.hostname;
    const { plans } = require('./core');
    const P = plans(type);
    const wa = (getSetting('whatsapp', '') || getSetting('pay_to', '')).replace(/\D/g, '').slice(-11);
    const waOk = /^01\d{9}$/.test(wa);
    const waLink = (msg) => (waOk ? `https://wa.me/88${wa}?text=${encodeURIComponent(msg)}` : '#price');
    const bnNum = (n) => Math.round(n).toLocaleString('bn-BD');
    const save = P.monthly * 12 - P.yearly;
    const vals = {
      '{{BASE}}': `https://${host}`, '{{DOMAIN}}': host,
      '{{PRICE_M}}': bnNum(P.monthly), '{{PRICE_Y}}': bnNum(P.yearly), '{{TRIAL}}': bnNum(P.trialDays), '{{PER_DAY}}': bnNum(Math.max(1, P.monthly / 30)),
      '{{SAVE_LINE}}': save > 0 ? `<div class="save">মাসিকের চেয়ে ৳${bnNum(save)} সাশ্রয়</div>` : '',
      '{{WA_ICON}}': WA_ICON, '{{WA_LOCAL}}': wa, '{{WA_SHOW}}': waOk ? `${wa.slice(0, 5)}-${wa.slice(5)}` : '',
      '{{WA_LINK_TRIAL}}': waLink(`আসসালামু আলাইকুম। আমি ${bname} ${P.trialDays} দিন ফ্রি ট্রায়াল শুরু করতে চাই।\nদোকানের নাম: \nমালিকের নাম: \nএলাকা: `),
      '{{WA_LINK_M}}': waLink(`আসসালামু আলাইকুম। আমি ${bname}র মাসিক প্ল্যান (৳${P.monthly}) নিতে চাই।\nদোকানের নাম: \nএলাকা: `),
      '{{WA_LINK_Y}}': waLink(`আসসালামু আলাইকুম। আমি ${bname}র বার্ষিক প্ল্যান (৳${P.yearly}) নিতে চাই।\nদোকানের নাম: \nএলাকা: `),
      '{{WA_LINK_Q}}': waLink(`আসসালামু আলাইকুম। ${bname} নিয়ে আমার একটা প্রশ্ন আছে: `),
    };
    let html = TPL[type];
    for (const [k, v] of Object.entries(vals)) html = html.replaceAll(k, v);
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(html);
  });
  // The app page. NirmanKhata hosts get their own title, icon and colours (also the home-screen icon).
  const INDEX = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const INDEX_BUILD = INDEX.replace('<html lang="bn">', '<html lang="bn" data-brand="build">').replace(/<title>[^<]*<\/title>/, '<title>নির্মাণখাতা — NirmanKhata</title>')
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="রড, সিমেন্ট, টিন ও নির্মাণ সামগ্রী ব্যবসার হিসাব — NirmanKhata business manager">')
    .replace('content="#1f6b2a"', 'content="#7a3b1d"').replaceAll('/icon.svg', '/icon-build.svg').replace('/manifest.webmanifest', '/manifest-build.webmanifest');
  const { hostInfo } = require('./host');
  app.get(['/', '/shop', '/shop/:slug', '/login'], (req, res) => {
    let t = hostInfo(req).btype;
    if (req.params.slug) t = (get('SELECT btype FROM businesses WHERE slug=?', String(req.params.slug)) || {}).btype || t;
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(t === 'build' ? INDEX_BUILD : INDEX);
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'পাওয়া যায়নি', error_en: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.bn, error_en: err.en, ...err.extra });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'ভুল অনুরোধ', error_en: 'Bad request' });
    console.error(new Date().toISOString(), req.method, req.path, err);
    res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।', error_en: 'Server error. Please try again.' });
  });
  return app;
}

module.exports = { createApp };
