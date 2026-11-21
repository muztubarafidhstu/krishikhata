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
      name: b.name, place: b.place, phone: b.phone, cats: JSON.parse(b.cats),
      products: all('SELECT id,name,cat,unit,sell,stock>0 inStock FROM products WHERE business_id=? AND active=1 ORDER BY cat,id', b.id),
    });
  });

  app.use('/vendor/html2canvas.min.js', (_req, res) => res.sendFile(require.resolve('html2canvas/dist/html2canvas.min.js')));
  app.use('/vendor/jspdf.umd.min.js', (_req, res) => res.sendFile(require.resolve('jspdf/dist/jspdf.umd.min.js')));
  app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '1h' }));
  // Shareable app page: /app (download, short ad, demo logins, how-to)
  const fs = require('node:fs');
  const tpl = fs.readFileSync(path.join(__dirname, 'views', 'download.html'), 'utf8');
  const { DOMAIN } = require('./config');
  const { getSetting } = require('./db');
  app.get(['/app', '/download'], (req, res) => {
    const host = DOMAIN || req.hostname;
    const phone = getSetting('pay_to', '').replace(/\D/g, '');
    const contact = /^01\d{9}$/.test(phone)
      ? `<p style="margin:0 0 6px">যোগাযোগ / বিকাশ / নগদ:</p><a class="contact" href="tel:+88${phone}">${phone.slice(0, 5)}-${phone.slice(5)}</a>`
      : '<p style="margin:0">ফেসবুক পেজে ইনবক্স করুন।</p>';
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(tpl.replaceAll('{{BASE}}', `https://${host}`).replaceAll('{{DOMAIN}}', host).replace('{{CONTACT_BLOCK}}', contact));
  });
  app.get(['/', '/shop', '/shop/:slug', '/login'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
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
