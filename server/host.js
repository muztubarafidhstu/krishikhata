'use strict';
// Which address a request came to: the mother panel, a shop's own sub-address, or the main domain.
const { get } = require('./db');
const { DOMAIN, ADMIN_DOMAIN, BUILD_ADMIN_DOMAIN } = require('./config');

const { SEGMENTS, segByNum } = require('./segments');

const RESERVED = new Set(['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp', 'shop', 'static', 'cdn', 'ns1', 'ns2', 'test', 'demo', 'login', 'support', 'go']);
for (const a of [ADMIN_DOMAIN, BUILD_ADMIN_DOMAIN]) if (a && DOMAIN && a.endsWith('.' + DOMAIN)) RESERVED.add(a.slice(0, -DOMAIN.length - 1));
for (const s of SEGMENTS) if (s.legacyAdmin) RESERVED.add(s.legacyAdmin);
RESERVED.add('adminr');
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const slugValid = (s) => SLUG_RE.test(s) && !RESERVED.has(s) && !s.includes('--') && !/^(admin|app)\d+$/.test(s);

// Mother panels: admin1.<domain> … admin8.<domain> (one per segment), plus the older addresses.
function adminTypeOf(host) {
  host = String(host || '').toLowerCase();
  if (ADMIN_DOMAIN && host === ADMIN_DOMAIN) return 'agri';
  if (BUILD_ADMIN_DOMAIN && host === BUILD_ADMIN_DOMAIN) return 'build';
  if (!DOMAIN || !host.endsWith('.' + DOMAIN)) return null;
  const sub = host.slice(0, -DOMAIN.length - 1);
  const m = sub.match(/^admin(\d{1,2})$/);
  if (m && segByNum(m[1])) return segByNum(m[1]).key;
  const leg = SEGMENTS.find((s) => s.legacyAdmin === sub);
  return leg ? leg.key : null;
}
// Super admin start page: adminr.<domain> (also admin.<domain>) — links to every mother panel.
const LAUNCHER = ['adminr', 'admin'];
const isLauncherHost = (host) => { host = String(host || '').toLowerCase(); return !!DOMAIN && LAUNCHER.some((l) => host === `${l}.${DOMAIN}`); };
// demo.<domain>: the unlisted page with every demo link (full demos and 'new shop' demos).
const isDemoHost = (host) => !!DOMAIN && String(host || '').toLowerCase() === `demo.${DOMAIN}`;
const adminUrl = (t) => { const s = SEGMENTS.find((x) => x.key === t); return DOMAIN && s ? `https://admin${s.num}.${DOMAIN}` : ''; };

function hostInfo(req) {
  const host = String(req.hostname || '').toLowerCase();
  if (isLauncherHost(host)) return { kind: 'admin', host, btype: 'agri', launcher: true };
  if (isDemoHost(host)) return { kind: 'demos', host };
  const at = adminTypeOf(host);
  if (at) return { kind: 'admin', host, btype: at };
  if (DOMAIN && host.endsWith('.' + DOMAIN)) {
    const sub = host.slice(0, -DOMAIN.length - 1);
    if (sub && !sub.includes('.') && sub !== 'www') {
      const b = get('SELECT id,name,slug,btype FROM businesses WHERE slug=?', sub);
      return { kind: 'shop', host, slug: sub, biz: b || null, btype: b ? b.btype || 'agri' : 'agri' };
    }
  }
  return { kind: 'main', host };
}
// Address of a shop, e.g. https://karim.rafid5.com
const shopUrl = (slug) => (DOMAIN ? `https://${slug}.${DOMAIN}` : `/shop/${slug}`);

module.exports = { hostInfo, adminTypeOf, adminUrl, isLauncherHost, isDemoHost, slugValid, shopUrl, RESERVED };
