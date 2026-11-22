'use strict';
// Pictures for each business segment: a hero illustration and a background pattern.
// `node server/art.js` writes public/art/<key>.svg (illustration, drawn for a coloured background),
// public/art/pattern-<key>.svg (in the segment colour) and public/art/pattern-<key>-w.svg (white).
const fs = require('fs');
const path = require('path');
const { SEGMENTS } = require('./segments');

// Line icons (24 x 24) — taken from the app's own icon set, plus a few extra.
const P = {};
{
  const core = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'core.js'), 'utf8');
  const block = core.slice(core.indexOf('const P = {'), core.indexOf('};', core.indexOf('const P = {')));
  for (const m of block.matchAll(/(\w+):'([^']*)'/g)) P[m[1]] = m[2];
}
Object.assign(P, {
  helmet: '<path d="M4 16a8 8 0 0 1 16 0v2H4z"/><path d="M12 8v4M4 16h9"/>',
  lamp: '<path d="M8 3h8l3 7H5z"/><path d="M12 10v10M8 21h8"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
});
const PATTERN_ICONS = {
  agri: ['leaf', 'seed', 'sack', 'spray'], build: ['build', 'rod', 'sheet', 'plate'], bike: ['bike', 'helmet', 'gear', 'key'],
  brick: ['brick', 'stones', 'block', 'truck'], mobile: ['phone', 'headset', 'tv', 'bolt'], furniture: ['sofa', 'bed', 'lamp', 'table'],
  car: ['car', 'key', 'gear', 'drop'], hardware: ['wrench', 'pipe', 'tap', 'hammer'],
};
function pattern(key, stroke) {
  const ic = PATTERN_ICONS[key];
  const spots = [[14, 14, 0], [88, 24, 18], [30, 88, -14], [100, 98, 10]];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><g fill="none" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${
    spots.map(([x, y, r], i) => `<g transform="translate(${x} ${y}) rotate(${r} 18 18) scale(1.5)">${P[ic[i % ic.length]] || ''}</g>`).join('')}</g></svg>`;
}

const mix = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
const range = (n) => Array.from({ length: n }, (_, i) => i);

// Hero illustrations (480 x 300), drawn to sit on the segment's coloured gradient.
const SCENES = {
  agri: (s) => `<circle cx="392" cy="70" r="36" fill="#ffd34d"/>
    <g fill="#fff" opacity=".85"><ellipse cx="120" cy="64" rx="36" ry="13"/><ellipse cx="148" cy="54" rx="26" ry="14"/><ellipse cx="96" cy="58" rx="20" ry="10"/></g>
    <path d="M0 210 Q120 166 250 196 T480 182 V300 H0Z" fill="#fff" opacity=".14"/><path d="M0 246 Q150 214 300 238 T480 228 V300 H0Z" fill="#000" opacity=".14"/>
    <g fill="#cdeb8b">${range(10).map((i) => { const x = 36 + i * 30; return `<path d="M${x} 292 q-6 -36 0 -58 q6 22 0 58z"/><path d="M${x} 268 q-18 -10 -21 -28 q16 6 21 28z"/><path d="M${x} 260 q16 -12 20 -28 q-15 6 -20 28z"/>`; }).join('')}</g>
    <rect x="398" y="160" width="12" height="96" fill="#6b4220"/><circle cx="404" cy="146" r="38" fill="#5fb85a"/><circle cx="376" cy="166" r="24" fill="#7cc96e"/><circle cx="432" cy="166" r="24" fill="#4a9e47"/>
    <path d="M330 258 q-4 -40 14 -48 h32 q18 8 14 48z" fill="#fff"/><path d="M338 214 q22 -12 44 0" stroke="${s.dark}" stroke-width="4" fill="none"/><circle cx="360" cy="238" r="8" fill="#ffd34d"/>`,
  build: (s) => {
    const win = (x, y, c, r) => range(c * r).map((i) => `<rect x="${x + (i % c) * 14}" y="${y + Math.floor(i / c) * 16}" width="7" height="9" rx="1"/>`).join('');
    return `<circle cx="330" cy="58" r="30" fill="#ffd34d"/>
    <rect x="120" y="148" width="58" height="122" rx="3" fill="#f6d7bf"/><rect x="186" y="96" width="74" height="174" rx="3" fill="#fde9d7"/><rect x="268" y="168" width="52" height="102" rx="3" fill="#efbf9a"/>
    <g fill="${s.dark}" opacity=".45">${win(130, 160, 3, 6)}${win(198, 110, 4, 9)}${win(278, 180, 2, 5)}</g>
    <g fill="none" stroke="#fff" stroke-width="4" opacity=".9"><path d="M336 270V176h66v94M336 206h66M336 238h66M358 176v94M380 176v94"/></g>
    <g fill="none" stroke="#ffd34d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M436 270V36M424 270l12-16 12 16M436 36H300M436 36h30M436 36l-38 18M300 36v46"/></g>
    <rect x="290" y="82" width="20" height="13" rx="2" fill="#ffd34d"/><path d="M0 270h480v30H0z" fill="#000" opacity=".22"/>`;
  },
  bike: (s) => `<circle cx="404" cy="62" r="30" fill="#ffd34d"/>
    <path d="M0 196 Q140 150 290 180 T480 168 V246 H0Z" fill="#fff" opacity=".12"/><rect y="246" width="480" height="54" fill="#000" opacity=".24"/>
    <path d="M0 274 H480" stroke="#fff" stroke-width="4" stroke-dasharray="26 20" opacity=".7"/>
    <g stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"><path d="M26 160h80M50 186h70M20 212h74"/></g>
    <path d="M328 150 L460 122 L460 190 Z" fill="#ffd34d" opacity=".22"/>
    <ellipse cx="240" cy="264" rx="128" ry="8" fill="#000" opacity=".22"/>
    <g fill="none" stroke="#fff" stroke-width="10"><circle cx="150" cy="226" r="36"/><circle cx="332" cy="226" r="36"/></g>
    <circle cx="150" cy="226" r="11" fill="#ffd34d"/><circle cx="332" cy="226" r="11" fill="#ffd34d"/>
    <path d="M150 226 L226 202" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
    <rect x="204" y="182" width="60" height="38" rx="9" fill="#fff" opacity=".88"/><path d="M216 222 H292" stroke="#e5e7eb" stroke-width="9" stroke-linecap="round"/>
    <path d="M176 184 L216 148 L292 148 L320 170 L302 184 Z" fill="#fff"/><path d="M222 148 Q256 124 292 148 Z" fill="#ffd34d"/>
    <path d="M166 166 L222 148 L222 160 L174 178 Z" fill="#111827" opacity=".55"/><path d="M146 176 L176 165 L180 181 L150 188 Z" fill="#fff"/>
    <path d="M332 226 L306 140" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M296 132 L324 126" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <circle cx="320" cy="154" r="10" fill="#ffd34d"/>`,
  brick: (s) => {
    const light = mix(s.color, '#ffffff', 0.72);
    let bricks = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6 - r; c++) bricks += `<rect x="${34 + r * 19 + c * 38}" y="${236 - r * 17}" width="35" height="15" rx="2" fill="${(r + c) % 2 ? '#fff' : light}" stroke="${s.dark}" stroke-opacity=".35"/>`;
    return `<circle cx="70" cy="62" r="28" fill="#ffd34d"/>
    <path d="M0 252h480v48H0z" fill="#000" opacity=".2"/>
    <g fill="#e5e7eb" opacity=".75"><circle cx="384" cy="34" r="15"/><circle cx="404" cy="18" r="19"/><circle cx="432" cy="10" r="23"/><circle cx="462" cy="16" r="18"/></g>
    <path d="M366 46 L398 46 L410 252 L354 252 Z" fill="#fff"/>
    <g stroke="${s.dark}" stroke-opacity=".35" stroke-width="2">${range(11).map((i) => `<path d="M${364 - i * 0.6} ${66 + i * 18}h${36 + i * 1.2}"/>`).join('')}</g>
    <rect x="362" y="40" width="40" height="10" rx="2" fill="#ffd34d"/>
    <rect x="296" y="200" width="172" height="52" rx="8" fill="#fff" opacity=".9"/>
    <g fill="${s.dark}" opacity=".55"><path d="M314 252v-24a12 12 0 0 1 24 0v24z"/><path d="M354 252v-24a12 12 0 0 1 24 0v24z"/><path d="M424 252v-24a12 12 0 0 1 24 0v24z"/></g>
    <g fill="#ffd34d" opacity=".8"><path d="M318 252l8-14 8 14z"/><path d="M428 252l8-14 8 14z"/></g>${bricks}`;
  },
  mobile: (s) => {
    const tint = mix(s.color, '#ffffff', 0.85);
    return `<circle cx="300" cy="150" r="130" fill="#fff" opacity=".07"/><circle cx="300" cy="150" r="90" fill="#fff" opacity=".07"/>
    <g transform="rotate(-12 200 160)"><rect x="150" y="60" width="104" height="196" rx="16" fill="#fff" opacity=".4"/></g>
    <rect x="246" y="36" width="124" height="228" rx="20" fill="#fff"/><rect x="256" y="58" width="104" height="176" rx="8" fill="${tint}"/>
    <rect x="256" y="58" width="104" height="26" rx="8" fill="${s.color}"/><rect x="292" y="44" width="32" height="5" rx="2.5" fill="#d1d5db"/>
    <g fill="#fff"><rect x="264" y="92" width="88" height="30" rx="6"/><rect x="264" y="128" width="88" height="30" rx="6"/></g>
    <g fill="${s.color}" opacity=".75"><rect x="270" y="99" width="40" height="5" rx="2"/><rect x="270" y="135" width="52" height="5" rx="2"/></g>
    <g fill="${s.color}"><rect x="270" y="196" width="12" height="30" rx="2"/><rect x="288" y="184" width="12" height="42" rx="2"/><rect x="306" y="202" width="12" height="24" rx="2"/></g><rect x="324" y="176" width="12" height="50" rx="2" fill="#f2a516"/>
    <circle cx="308" cy="250" r="5" fill="#d1d5db"/>
    <path d="M70 196a52 52 0 0 1 104 0" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><rect x="58" y="186" width="24" height="42" rx="8" fill="#fff"/><rect x="162" y="186" width="24" height="42" rx="8" fill="#fff"/>
    <g fill="none" stroke="#ffd34d" stroke-width="6" stroke-linecap="round"><path d="M404 70a30 30 0 0 1 30 30"/><path d="M404 46a54 54 0 0 1 54 54"/></g><circle cx="404" cy="100" r="7" fill="#ffd34d"/>
    <path d="M392 270c20-30 50-10 64-40" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/><rect x="448" y="214" width="20" height="26" rx="4" fill="#fff"/>
    <g fill="#ffd34d"><path d="M110 60l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/><path d="M200 26l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>`;
  },
  furniture: (s) => {
    const tint = mix(s.color, '#ffffff', 0.55);
    return `<path d="M0 242h480v58H0z" fill="#000" opacity=".2"/>
    <rect x="200" y="34" width="120" height="78" rx="4" fill="#fff" opacity=".15" stroke="#fff" stroke-width="6"/><path d="M212 104l30-34 22 24 16-14 28 24z" fill="#ffd34d"/><circle cx="292" cy="58" r="8" fill="#ffd34d"/>
    <rect x="160" y="132" width="210" height="62" rx="18" fill="#fff" opacity=".92"/>
    <rect x="140" y="176" width="250" height="56" rx="14" fill="#fff"/>
    <rect x="132" y="160" width="36" height="72" rx="14" fill="#fff"/><rect x="362" y="160" width="36" height="72" rx="14" fill="#fff"/>
    <rect x="176" y="182" width="88" height="26" rx="10" fill="${tint}"/><rect x="270" y="182" width="88" height="26" rx="10" fill="${tint}"/>
    <rect x="184" y="146" width="44" height="34" rx="10" fill="#ffd34d" transform="rotate(-8 206 163)"/>
    <g fill="#fff"><rect x="150" y="232" width="8" height="12" rx="2"/><rect x="372" y="232" width="8" height="12" rx="2"/></g>
    <path d="M92 112 L72 60 L112 60 Z" fill="#ffd34d"/><path d="M92 112 V238" stroke="#fff" stroke-width="5"/><ellipse cx="92" cy="240" rx="22" ry="5" fill="#fff"/>
    <path d="M86 60 h12" stroke="#fff" stroke-width="3"/>
    <path d="M412 204 h40 l-6 38 h-28z" fill="#fff"/>
    <g fill="#86efac"><ellipse cx="420" cy="180" rx="10" ry="26" transform="rotate(-24 420 180)"/><ellipse cx="444" cy="176" rx="10" ry="28" transform="rotate(20 444 176)"/><ellipse cx="432" cy="166" rx="9" ry="30"/></g>`;
  },
  car: (s) => {
    const glass = mix(s.color, '#000000', 0.25);
    return `<circle cx="80" cy="60" r="28" fill="#ffd34d"/>
    <g fill="#fff" opacity=".12"><rect x="150" y="80" width="40" height="150"/><rect x="196" y="56" width="52" height="174"/><rect x="254" y="104" width="36" height="126"/><rect x="296" y="70" width="46" height="160"/><rect x="348" y="118" width="40" height="112"/><rect x="394" y="92" width="50" height="138"/></g>
    <rect y="230" width="480" height="70" fill="#000" opacity=".24"/><path d="M0 268H480" stroke="#fff" stroke-width="4" stroke-dasharray="26 20" opacity=".7"/>
    <ellipse cx="256" cy="250" rx="160" ry="8" fill="#000" opacity=".25"/>
    <path d="M104 234 L112 200 Q120 184 142 180 L190 150 Q202 140 220 140 L306 140 Q326 140 340 154 L372 180 L406 186 Q424 190 424 208 L424 234 Z" fill="#fff"/>
    <path d="M196 158 L216 150 L262 150 L262 180 L178 180 Z" fill="${glass}" opacity=".7"/><path d="M270 150 L304 150 Q316 150 324 160 L340 180 L270 180 Z" fill="${glass}" opacity=".7"/>
    <path d="M266 182 V226" stroke="${glass}" stroke-opacity=".35" stroke-width="3"/><rect x="236" y="194" width="18" height="5" rx="2" fill="${glass}" opacity=".5"/>
    <path d="M410 196 h14 v12 h-14z" fill="#ffd34d"/><path d="M104 206 h10 v12 h-10z" fill="#ef4444"/>
    <g><circle cx="168" cy="236" r="28" fill="#1f2937"/><circle cx="168" cy="236" r="12" fill="#e5e7eb"/><circle cx="356" cy="236" r="28" fill="#1f2937"/><circle cx="356" cy="236" r="12" fill="#e5e7eb"/></g>
    <g transform="translate(400 40) rotate(-20)" fill="none" stroke="#ffd34d" stroke-width="5" stroke-linecap="round"><circle cx="10" cy="24" r="10"/><path d="M18 16l22-22M32 -2l7 7M27 3l5 5"/></g>`;
  },
  hardware: (s) => `<rect x="36" y="30" width="408" height="160" rx="14" fill="#fff" opacity=".12"/>
    <g fill="#fff" opacity=".35">${range(8).flatMap((i) => range(3).map((j) => `<circle cx="${70 + i * 50}" cy="${58 + j * 50}" r="3"/>`)).join('')}</g>
    <g transform="translate(80 56) rotate(-30)"><path d="M0 0 a16 16 0 0 0 20 20 L74 74 a8 8 0 0 1 -12 12 L8 32 a16 16 0 0 1 -20 -20 l12 6 8 -8z" fill="#fff"/></g>
    <g transform="translate(200 50)"><rect x="0" y="0" width="56" height="22" rx="4" fill="#ffd34d"/><rect x="22" y="22" width="12" height="96" rx="4" fill="#fff"/></g>
    <g transform="translate(300 52) rotate(18)"><rect x="0" y="0" width="12" height="62" rx="4" fill="#fff"/><path d="M2 62 h8 l-4 34z" fill="#e5e7eb"/><rect x="-4" y="-6" width="20" height="16" rx="5" fill="#ffd34d"/></g>
    <g fill="#fff"><path d="M384 60 l14 8 v16 l-14 8 -14 -8 v-16z"/><path d="M410 118 l10 6 v12 l-10 6 -10 -6 v-12z"/></g><g fill="${s.dark}" opacity=".5"><circle cx="384" cy="76" r="5"/><circle cx="410" cy="130" r="4"/></g>
    <path d="M0 236h480v64H0z" fill="#000" opacity=".2"/>
    <path d="M30 254 H210 V214 H300" fill="none" stroke="#fff" stroke-width="18" stroke-linejoin="round"/>
    <g fill="#ffd34d"><rect x="196" y="240" width="28" height="28" rx="4"/><rect x="196" y="200" width="28" height="28" rx="4"/><rect x="120" y="244" width="14" height="20" rx="2"/></g>
    <path d="M300 204 h22 v-20 h14 v34 h-36z" fill="#fff"/><path d="M332 224 c6 10 6 16 0 22 c-6 -6 -6 -12 0 -22z" fill="#7dd3fc"/>
    <path d="M378 196 h64 l-6 54 h-52z" fill="#fff"/><ellipse cx="410" cy="196" rx="32" ry="7" fill="#ffd34d"/><path d="M386 198 v16 a4 4 0 0 0 8 0 v-14" fill="#ffd34d"/><rect x="392" y="214" width="36" height="14" rx="3" fill="${s.color}" opacity=".6"/>`,
};
const scene = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" fill="none">${SCENES[s.key](s)}</svg>`;

if (require.main === module) {
  const dir = path.join(__dirname, '..', 'public', 'art');
  fs.mkdirSync(dir, { recursive: true });
  for (const s of SEGMENTS) {
    fs.writeFileSync(path.join(dir, `${s.key}.svg`), scene(s) + '\n');
    fs.writeFileSync(path.join(dir, `pattern-${s.key}.svg`), pattern(s.key, s.color) + '\n');
    fs.writeFileSync(path.join(dir, `pattern-${s.key}-w.svg`), pattern(s.key, '#ffffff') + '\n');
  }
  console.log('wrote art for', SEGMENTS.map((s) => s.key).join(', '));
}
module.exports = { scene, pattern };
