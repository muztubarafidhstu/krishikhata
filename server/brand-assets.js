'use strict';
// Icons and colours for segments 3–8 (KrishiKhata and NirmanKhata have hand-made files).
// `node server/brand-assets.js` writes public/icon-<key>.svg and public/manifest-<key>.webmanifest.
const { SEGMENTS } = require('./segments');

// Same drawings as the app's icon set (public/js/core.js), 24 x 24.
const ICON = {
  bike: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5l4-7h5l4 7M9.5 9.5L8 6H5.5M14.5 9.5l2-3.5h2.5M12 16.5l2.5-7"/>',
  brick: '<rect x="2" y="5" width="9" height="4" rx=".5"/><rect x="13" y="5" width="9" height="4" rx=".5"/><rect x="7" y="10" width="10" height="4" rx=".5"/><rect x="2" y="15" width="9" height="4" rx=".5"/><rect x="13" y="15" width="9" height="4" rx=".5"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/>',
  car: '<path d="M3 16V12l2.5-5h13L21 12v4z"/><path d="M3 12h18"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5l3-3 3 3-3 3"/>',
};
const mixHex = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');

const iconSvg = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${s.color}"/><rect y="56" width="64" height="8" fill="#f2a516"/><g transform="translate(8 6) scale(2)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[s.icon] || ''}</g></svg>`;
const manifest = (s) => JSON.stringify({ name: `${s.bn} — ${s.en}`, short_name: s.bn, start_url: '/', display: 'standalone', background_color: '#f3f5f8', theme_color: s.dark,
  icons: [{ src: `/icon-${s.key}.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] }, null, 2);
// Colour variables for the app page, so the right colour shows before the script runs.
const cssVars = (s) => `--brand:${s.color};--brand-d:${s.dark};--brand-l:${mixHex(s.color, '#ffffff', 0.86)};--brand-2:${mixHex(s.color, '#ffffff', 0.35)};--brand-lt:${mixHex(s.color, '#ffffff', 0.38)};--brand-lt2:${mixHex(s.color, '#ffffff', 0.6)};--brand-dl:${mixHex(s.color, '#000000', 0.68)}`;
const NEW = SEGMENTS.filter((s) => !['agri', 'build'].includes(s.key));

if (require.main === module) {
  const fs = require('fs'), path = require('path');
  const pub = path.join(__dirname, '..', 'public');
  for (const s of NEW) {
    fs.writeFileSync(path.join(pub, `icon-${s.key}.svg`), iconSvg(s) + '\n');
    fs.writeFileSync(path.join(pub, `manifest-${s.key}.webmanifest`), manifest(s) + '\n');
  }
  console.log('wrote icons and manifests for', NEW.map((s) => s.key).join(', '));
}

module.exports = { ICON, iconSvg, cssVars, NEW };
