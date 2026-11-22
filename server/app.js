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
  // Sales pages: /app1 … /app8 (one per segment). The older /app and /nirman links still work.
  const { SEGMENTS, segByNum } = require('./segments');
  const pages = require('./pages');
  const { limit } = require('./auth');
  const { normPhone, validPhone } = require('./security');
  const { shopUrl, hostInfo: hostOf } = require('./host');
  const { plans } = require('./core');
  const bnNum = (n) => Math.round(n).toLocaleString('bn-BD');
  const pageVars = (req, s) => {
    const host = DOMAIN || req.hostname;
    const P = plans(s ? s.key : 'agri');
    const wa = (getSetting('whatsapp', '') || getSetting('pay_to', '')).replace(/\D/g, '').slice(-11);
    const waOk = /^01\d{9}$/.test(wa);
    const waLink = (msg) => (waOk ? `https://wa.me/88${wa}?text=${encodeURIComponent(msg)}` : '#price');
    const bname = s ? s.bn : 'আপনাদের সফটওয়্যার';
    return {
      base: `https://${host}`, domain: host, P, WA: WA_ICON, waLocal: wa, waShow: waOk ? `${wa.slice(0, 5)}-${wa.slice(5)}` : '', nf: req.query.nf === '1', q: String(req.query.q || '').slice(0, 80),
      prices: Object.fromEntries(SEGMENTS.map((x) => [x.key, plans(x.key)])),
      waTrial: waLink(`আসসালামু আলাইকুম। আমি ${bname} ${P.trialDays} দিন ফ্রি ট্রায়াল শুরু করতে চাই।\nদোকানের নাম: \nমালিকের নাম: \nএলাকা: `),
      waM: waLink(`আসসালামু আলাইকুম। আমি ${bname}র মাসিক প্ল্যান (৳${P.monthly}) নিতে চাই।\nদোকানের নাম: \nএলাকা: `),
      waY: waLink(`আসসালামু আলাইকুম। আমি ${bname}র বার্ষিক প্ল্যান (৳${P.yearly}) নিতে চাই।\nদোকানের নাম: \nএলাকা: `),
      waQ: waLink(`আসসালামু আলাইকুম। ${bname} নিয়ে আমার একটা প্রশ্ন আছে: `),
    };
  };
  const sendPage = (res, html) => { res.setHeader('Cache-Control', 'no-cache'); res.type('html').send(html); };
  app.get(['/app', '/download'], (_req, res) => res.redirect(301, '/app1'));
  app.get('/nirman', (_req, res) => res.redirect(301, '/app2'));
  app.get(/^\/app(\d{1,2})\/?$/, (req, res, next) => {
    const s = segByNum(req.params[0]); if (!s) return next();
    const v = pageVars(req, s);
    if (!TPL[s.key]) return sendPage(res, pages.segPage(s, v));
    // KrishiKhata and NirmanKhata keep their own hand-made pages, plus the shared blocks.
    const save = v.P.monthly * 12 - v.P.yearly;
    const vals = {
      '{{BASE}}': v.base, '{{DOMAIN}}': v.domain,
      '{{PRICE_M}}': bnNum(v.P.monthly), '{{PRICE_Y}}': bnNum(v.P.yearly), '{{TRIAL}}': bnNum(v.P.trialDays), '{{PER_DAY}}': bnNum(Math.max(1, v.P.monthly / 30)),
      '{{SAVE_LINE}}': save > 0 ? `<div class="save">মাসিকের চেয়ে ৳${bnNum(save)} সাশ্রয়</div>` : '',
      '{{WA_ICON}}': WA_ICON, '{{WA_LOCAL}}': v.waLocal, '{{WA_SHOW}}': v.waShow,
      '{{WA_LINK_TRIAL}}': v.waTrial, '{{WA_LINK_M}}': v.waM, '{{WA_LINK_Y}}': v.waY, '{{WA_LINK_Q}}': v.waQ,
      '{{SHARED_CSS}}': `:root{--seg:${s.color};--seg-d:${s.dark}}` + pages.SHARED_CSS,
      '{{FINDER}}': pages.finderHTML(v.nf, v.q), '{{ALLAPPS}}': pages.allAppsHTML(s.key, v.prices),
    };
    let html = TPL[s.key];
    for (const [k, val] of Object.entries(vals)) html = html.replaceAll(k, val);
    sendPage(res, html);
  });
  // "Go to my shop": the shop's address name (karim), its full name, or a user's mobile number → that shop's own address.
  // The super admin's number opens the mother panel of the page it was typed on.
  const { adminUrl } = require('./host');
  app.get('/go', (req, res) => {
    if (!limit('go:' + req.ip, 60, 10 * 60000)) return res.status(429).type('text').send('অনেকবার চেষ্টা হয়েছে। একটু পরে আবার চেষ্টা করুন।');
    const raw = String(req.query.q || '').trim().slice(0, 80);
    let q = raw.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (DOMAIN) q = q.replace('.' + DOMAIN, '');
    let back = '/';
    try { const r = new URL(req.get('referer') || ''); if (/^\/(app\d{1,2})?$/.test(r.pathname)) back = r.pathname; } catch (e) { /* no referer */ }
    const digits = q.replace(/[\s-]/g, '');
    if (/^\+?[0-9০-৯]{10,14}$/.test(digits) && validPhone(normPhone(digits))) {
      const phone = normPhone(digits);
      const u = get('SELECT role,business_id FROM users WHERE phone=? AND active=1', phone);
      if (u && u.role === 'super') { const seg = segByNum((back.match(/^\/app(\d+)/) || [])[1] || 1); const url = seg && adminUrl(seg.key); if (url) return res.redirect(302, url); }
      const b = u && u.business_id && get('SELECT slug FROM businesses WHERE id=?', u.business_id);
      if (b) return res.redirect(302, shopUrl(b.slug) + '/#id=' + phone);
    } else if (q) {
      const slug = q.replace(/\s+/g, '-');
      let b = /^[a-z0-9-]{2,30}$/.test(slug) && get('SELECT slug FROM businesses WHERE slug=?', slug);
      if (!b) { const byName = all('SELECT slug FROM businesses WHERE lower(name)=lower(?) LIMIT 2', raw); if (byName.length === 1) b = byName[0]; }
      if (!b && raw.length >= 3) { const like = all("SELECT slug FROM businesses WHERE name LIKE ? ESCAPE '\\' LIMIT 2", '%' + raw.replace(/[\\%_]/g, (c) => '\\' + c) + '%'); if (like.length === 1) b = like[0]; }
      if (b) return res.redirect(302, shopUrl(b.slug));
    }
    res.redirect(302, back + '?nf=1&q=' + encodeURIComponent(raw) + '#finder');
  });

  // The app page. NirmanKhata hosts get their own title, icon and colours (also the home-screen icon).
  const INDEX = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const INDEX_BUILD = INDEX.replace('<html lang="bn">', '<html lang="bn" data-brand="build">').replace(/<title>[^<]*<\/title>/, '<title>নির্মাণখাতা — NirmanKhata</title>')
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="রড, সিমেন্ট, টিন ও নির্মাণ সামগ্রী ব্যবসার হিসাব — NirmanKhata business manager">')
    .replace('content="#1f6b2a"', 'content="#7a3b1d"').replaceAll('/icon.svg', '/icon-build.svg').replace('/manifest.webmanifest', '/manifest-build.webmanifest');
  const { hostInfo } = require('./host');
  // Segments 3–8: their own title, icon, colour and home-screen manifest.
  const { NEW: NEWSEG, cssVars } = require('./brand-assets');
  const INDEX_SEG = Object.fromEntries(NEWSEG.map((x) => [x.key, INDEX.replace('<html lang="bn">', `<html lang="bn" data-brand="${x.key}" data-palette="seg" style="${cssVars(x)}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${x.bn} — ${x.en}</title>`).replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${x.what.bn} ব্যবসার হিসাব — ${x.en}">`)
    .replace('content="#1f6b2a"', `content="${x.dark}"`).replaceAll('/icon.svg', `/icon-${x.key}.svg`).replace('/manifest.webmanifest', `/manifest-${x.key}.webmanifest`)]));
  app.get(['/', '/shop', '/shop/:slug', '/login'], (req, res) => {
    // The main address (rafid5.com) opens the page listing every software; the app itself is at /login there.
    if (req.path === '/' && DOMAIN && hostOf(req).kind === 'main') return sendPage(res, pages.hubPage(pageVars(req, null)));
    let t = hostInfo(req).btype;
    if (req.params.slug) t = (get('SELECT btype FROM businesses WHERE slug=?', String(req.params.slug)) || {}).btype || t;
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(t === 'build' ? INDEX_BUILD : INDEX_SEG[t] || INDEX);
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
