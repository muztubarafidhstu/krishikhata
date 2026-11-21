'use strict';
// Which address a request came to: the mother panel, a shop's own sub-address, or the main domain.
const { get } = require('./db');
const { DOMAIN, ADMIN_DOMAIN } = require('./config');

const RESERVED = new Set(['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp', 'shop', 'static', 'cdn', 'ns1', 'ns2', 'test', 'demo', 'login', 'support']);
if (ADMIN_DOMAIN && DOMAIN && ADMIN_DOMAIN.endsWith('.' + DOMAIN)) RESERVED.add(ADMIN_DOMAIN.slice(0, -DOMAIN.length - 1));
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const slugValid = (s) => SLUG_RE.test(s) && !RESERVED.has(s) && !s.includes('--');

function hostInfo(req) {
  const host = String(req.hostname || '').toLowerCase();
  if (ADMIN_DOMAIN && host === ADMIN_DOMAIN) return { kind: 'admin', host };
  if (DOMAIN && host.endsWith('.' + DOMAIN)) {
    const sub = host.slice(0, -DOMAIN.length - 1);
    if (sub && !sub.includes('.') && sub !== 'www') {
      const b = get('SELECT id,name,slug FROM businesses WHERE slug=?', sub);
      return { kind: 'shop', host, slug: sub, biz: b || null };
    }
  }
  return { kind: 'main', host };
}
// Address of a shop, e.g. https://karim.rafid5.com
const shopUrl = (slug) => (DOMAIN ? `https://${slug}.${DOMAIN}` : `/shop/${slug}`);

module.exports = { hostInfo, slugValid, shopUrl, RESERVED };
