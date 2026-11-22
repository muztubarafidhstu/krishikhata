'use strict';
/* KrishiKhata front end — shared helpers, language, API calls, OTP box, page chrome. */

/* ---------- Icons ---------- */
const P = {
  dash:'<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  tag:'<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  truck:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11l2-8H6"/>',
  receipt:'<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  wallet:'<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4"/><circle cx="16.5" cy="13.5" r="1.3"/>',
  hand:'<path d="M3 13h4l4 3h5a2 2 0 0 0 0-4h-4"/><path d="M7 13v6H3M16 12l4-2a1.6 1.6 0 0 1 2 2.4L16 19h-5"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-4 3.5-6 6.5-6s5.7 2 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.3 0 4 1.5 4.5 4.5"/>',
  leaf:'<path d="M5 21c.5-6 3-10 9-13"/><path d="M20 3c-9 0-15 4-15 11 0 2 1 4 1 4s9 1 12-7c1-3 2-8 2-8z"/>',
  seed:'<path d="M12 21v-8"/><path d="M12 13c0-4-3-7-7-7 0 4 3 7 7 7z"/><path d="M12 11c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M7 21h10"/>',
  sack:'<path d="M8 6h8l-1-3H9z"/><path d="M8 6c-3 3-4 7-3 11 .5 2.5 2.5 4 4.5 4h5c2 0 4-1.5 4.5-4 1-4 0-8-3-11"/><path d="M9.5 13h5M12 10.5v5"/>',
  spray:'<rect x="7" y="9" width="8" height="12" rx="2"/><path d="M9 9V6h4v3M13 6h3l2-2M18 7h2M18 10h2M17.5 13.5h2"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="M5 12l5 5L20 7"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
  build:'<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>', crown:'<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7"/>',
  file:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>', money:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4M18 10v4"/>',
  down:'<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>', image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  lang:'<path d="M4 5h9M8.5 3v2M6 5c1 4 4 7 7 8M11 5c-1 4-4 7-7 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', reset:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  out:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>', back:'<path d="M15 18l-6-6 6-6"/>',
  edit:'<path d="M4 20h4L20 8l-4-4L4 16z"/>',
  rod:'<path d="M3 17L17 3M7 21L21 7M3 21l2-2M19 5l2-2"/>',
  sheet:'<path d="M3 7c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  angle:'<path d="M4 3h4v13h13v4H4z"/>', plate:'<path d="M3 9l9-5 9 5-9 5z"/><path d="M3 9v3l9 5 9-5V9"/>',
  bar:'<rect x="2" y="9" width="20" height="6" rx="1"/><path d="M6 9v6M18 9v6"/>',
  bike:'<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5l4-7h5l4 7M9.5 9.5L8 6H5.5M14.5 9.5l2-3.5h2.5M12 16.5l2.5-7"/>',
  car:'<path d="M3 16V12l2.5-5h13L21 12v4z"/><path d="M3 12h18"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/>',
  brick:'<rect x="2" y="5" width="9" height="4" rx=".5"/><rect x="13" y="5" width="9" height="4" rx=".5"/><rect x="7" y="10" width="10" height="4" rx=".5"/><rect x="2" y="15" width="9" height="4" rx=".5"/><rect x="13" y="15" width="9" height="4" rx=".5"/>',
  sofa:'<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/>',
  wrench:'<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5l3-3 3 3-3 3"/>',
  bed:'<path d="M3 18V8M3 14h18v4M21 18v-5a3 3 0 0 0-3-3h-7v4"/><circle cx="7" cy="11" r="2"/>',
  table:'<path d="M3 9h18M5 9v11M19 9v11M7 9V6h10v3"/>', door:'<path d="M6 21V3h12v18M4 21h16"/><circle cx="15" cy="12" r="1"/>',
  almirah:'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M12 3v18M10 11v2M14 11v2"/>',
  tv:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>', headset:'<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/>',
  pipe:'<path d="M3 8h11a4 4 0 0 1 4 4v9M3 14h8a1 1 0 0 1 1 1v6"/>', fitting:'<path d="M4 9h6V3h4v6h6v6h-6v6h-4v-6H4z"/>',
  tap:'<path d="M5 8h10a3 3 0 0 1 3 3v2M5 6v4M18 16v.01M18 19v.01"/><path d="M9 8V5h2v3"/>', tiles:'<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>',
  paint:'<rect x="3" y="3" width="15" height="6" rx="1"/><path d="M18 6h3v5h-9v3"/><rect x="10" y="14" width="4" height="7" rx="1"/>', bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  hammer:'<path d="M14 6l4 4M3 21l9-9M12 4l4-2 6 6-2 4-4-1-3-3z"/>', stones:'<circle cx="7" cy="15" r="3"/><circle cx="15" cy="16" r="3.5"/><circle cx="11" cy="8" r="3"/>',
  block:'<rect x="3" y="7" width="18" height="10" rx="1"/><rect x="6" y="10" width="4" height="4"/><rect x="14" y="10" width="4" height="4"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};
const I = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- Language & formatting ---------- */
let LANG = 'bn';
let LANG_SET = false; // true once this person picked a language on this address
try { const v = localStorage.getItem('kk-lang'); if (v) { LANG = v; LANG_SET = true; } } catch (e) {}
// NirmanKhata shop panels (owners and sellers) open in English; KrishiKhata, mother panels and public pages in Bangla.
function applyDefaultLang() {
  if (LANG_SET) return;
  LANG = btype() === 'build' && !(S.site && S.site.admin) && !(S.me && S.me.role === 'super') && role() !== 'public' ? 'en' : 'bn';
}
const L = (b, e) => (LANG === 'en' ? e : b);
const N = (x) => (x == null ? '' : typeof x === 'string' ? x : (x[LANG] ?? x.bn ?? x.en));
const BN_DIG = '০১২৩৪৫৬৭৮৯';
const dg = (s) => (LANG === 'bn' ? String(s ?? '').replace(/[0-9]/g, (d) => BN_DIG[d]) : String(s ?? ''));
const LOC = () => (LANG === 'bn' ? 'bn-BD' : 'en-IN');
const bn = (n) => Number(n || 0).toLocaleString(LOC(), { maximumFractionDigits: 2 });
const tk = (n) => '৳ ' + bn(Math.round((n || 0) * 100) / 100);
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;
const todayStr = () => (S.cur && S.cur.today) || (S.sup && S.sup.today) || new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const dayOff = (d) => { const x = new Date(todayStr() + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - d); return x.toISOString().slice(0, 10); };
const addMonths = (ds, n) => { const d = new Date(ds + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
const fmtDate = (s) => new Date(s + 'T00:00:00Z').toLocaleDateString(LANG === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtLong = (s) => (s ? new Date(s + 'T00:00:00Z').toLocaleDateString(LANG === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—');
const daysTo = (ds) => Math.round((new Date(ds + 'T00:00:00Z') - new Date(todayStr() + 'T00:00:00Z')) / DAY);

const toAscii = (s) => String(s ?? '').replace(/[০-৯]/g, (d) => BN_DIG.indexOf(d));
function calcExpr(s) {
  let i = 0; const pe = () => s[i];
  const num = () => { if (pe() === '(') { i++; const v = expr(); if (pe() === ')') i++; return v; } if (pe() === '-') { i++; return -num(); } const st = i; while (i < s.length && /[0-9.]/.test(s[i])) i++; if (st === i) throw 0; return parseFloat(s.slice(st, i)); };
  const term = () => { let v = num(); while (pe() === '*' || pe() === '/') { const o = s[i++], r = num(); v = o === '*' ? v * r : v / r; } return v; };
  const expr = () => { let v = term(); while (pe() === '+' || pe() === '-') { const o = s[i++], r = term(); v = o === '+' ? v + r : v - r; } return v; };
  const v = expr(); if (i !== s.length) throw 0; return v;
}
/* Accepts ১২৩৪ or 1234, commas, ৳, and simple sums like ৫০০+২৫০ or 12x50 */
function toNum(v) {
  const s = toAscii(v).replace(/[,\s৳]/g, '').replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/[+\-*/(.]+$/, '');
  if (!s || !/^[0-9.+\-*/()]+$/.test(s)) return 0;
  try { const r = calcExpr(s); return isFinite(r) ? Math.round(r * 100) / 100 : 0; } catch (e) { return 0; }
}
const pk = (s) => toAscii(s).replace(/\D/g, '').slice(-11);
const validPhone = (s) => /^01[3-9]\d{8}$/.test(pk(s));
const fmtPhone = (s) => { const d = pk(s); return d.length === 11 ? d.slice(0, 5) + '-' + d.slice(5) : String(s || ''); };
const PASS_RULES = [[/^.{5,}$/, { bn: 'কমপক্ষে ৫ অক্ষর', en: '5+ characters' }], [/[A-Za-z]/, { bn: 'একটি ইংরেজি অক্ষর', en: 'a letter' }], [/\d/, { bn: 'একটি সংখ্যা', en: 'a number' }], [/[^A-Za-z0-9\s]/, { bn: 'একটি চিহ্ন (@ # ! ইত্যাদি)', en: 'a symbol (@ # ! …)' }]];
const passOk = (p) => PASS_RULES.every(([r]) => r.test(p || ''));
const passMsg = () => L('পাসওয়ার্ডে কমপক্ষে ৫ অক্ষর, একটি অক্ষর, একটি সংখ্যা ও একটি চিহ্ন লাগবে', 'The password needs 5+ characters with a letter, a number and a symbol');
const rulesHTML = (p) => `<div class="rules">${PASS_RULES.map(([r, t]) => `<span class="${r.test(p || '') ? 'ok' : ''}">${r.test(p || '') ? '✓' : '•'} ${N(t)}</span>`).join('')}</div>`;

const UNIT = { kg: { bn: 'কেজি', en: 'kg', f: 'Kilogram' }, bag: { bn: 'বস্তা', en: 'bag', f: 'Bag' }, bottle: { bn: 'বোতল', en: 'bottle', f: 'Bottle' }, packet: { bn: 'প্যাকেট', en: 'packet', f: 'Packet' }, liter: { bn: 'লিটার', en: 'litre', f: 'Litre' }, ton: { bn: 'টন', en: 'ton', f: 'Ton' }, piece: { bn: 'পিস', en: 'piece', f: 'Piece' }, bundle: { bn: 'বান্ডিল', en: 'bundle', f: 'Bundle' }, feet: { bn: 'ফুট', en: 'feet', f: 'Feet' }, thousand: { bn: 'হাজার', en: '1000 pcs', f: 'Thousand' }, cft: { bn: 'সিএফটি', en: 'cft', f: 'CFT' }, set: { bn: 'সেট', en: 'set', f: 'Set' }, box: { bn: 'বক্স', en: 'box', f: 'Box' }, meter: { bn: 'মিটার', en: 'meter', f: 'Meter' } };
const U = (u) => N(UNIT[u] || u);
// Labels for lists and forms. NirmanKhata: "Kilogram (কেজি)", "Rod (রড)"; KrishiKhata: in the chosen language.
const UL = (u) => (btype() === 'build' && UNIT[u] ? `${UNIT[u].f} (${UNIT[u].bn})` : U(u));
const CN = (k) => (!CAT[k] ? esc(k) : btype() === 'build' ? `${CAT[k].n.en} (${CAT[k].n.bn})` : N(CAT[k].n));
const CAT = {
  seed: { n: { bn: 'বীজ', en: 'Seed' }, icon: 'seed', cls: 'p-seed', color: 'var(--seed)', bg: 'var(--sun-l)', d: { bn: 'ধান, ভুট্টা, সবজি, পাট বীজ — প্যাকেট/কেজি হিসাবে', en: 'Rice, maize, vegetable, jute seed — by packet or kg' } },
  fert: { n: { bn: 'সার', en: 'Fertilizer' }, icon: 'sack', cls: 'p-fert', color: 'var(--fert)', bg: 'var(--sky-l)', d: { bn: 'ইউরিয়া, টিএসপি, এমওপি, জিপসাম — বস্তা/কেজি হিসাবে', en: 'Urea, TSP, MOP, gypsum — by bag or kg' } },
  rod: { n: { bn: 'রড', en: 'Rod' }, icon: 'rod', cls: 'p-rod', color: 'var(--soil)', bg: 'var(--soil-l)', d: { bn: 'MS / SS রড — কেজি বা টন হিসাবে', en: 'MS / SS rod — by kg or ton' } },
  cement: { n: { bn: 'সিমেন্ট', en: 'Cement' }, icon: 'sack', cls: 'p-cement', color: 'var(--muted)', bg: 'var(--surface2)', d: { bn: 'সব কোম্পানির সিমেন্ট — বস্তা হিসাবে', en: 'Cement of any company — by bag' } },
  tin: { n: { bn: 'ঢেউটিন', en: 'Tin' }, icon: 'sheet', cls: 'p-tin', color: 'var(--sky)', bg: 'var(--sky-l)', d: { bn: 'কোম্পানি, পুরুত্ব ও ফুট মাপ — বান্ডিল বা পিস হিসাবে', en: 'Company, thickness, size in feet — by bundle or piece' } },
  sheet: { n: { bn: 'শিট', en: 'Sheet' }, icon: 'plate', cls: 'p-sheet', color: 'var(--berry)', bg: 'var(--berry-l)', d: { bn: 'MS / SS শিট — কেজি বা টন হিসাবে', en: 'MS / SS sheet — by kg or ton' } },
  angle: { n: { bn: 'অ্যাঙ্গেল', en: 'Angle' }, icon: 'angle', cls: 'p-angle', color: 'var(--pest)', bg: 'var(--pest-l)', d: { bn: 'MS / SS অ্যাঙ্গেল — কেজি বা টন হিসাবে', en: 'MS / SS angle — by kg or ton' } },
  bar: { n: { bn: 'বার', en: 'Bar' }, icon: 'bar', cls: 'p-bar', color: 'var(--seed)', bg: 'var(--sun-l)', d: { bn: 'MS / SS বার — কেজি বা টন হিসাবে', en: 'MS / SS bar — by kg or ton' } },
  other: { n: { bn: 'অন্যান্য', en: 'Other' }, icon: 'box', cls: 'p-ok', color: 'var(--leaf)', bg: 'var(--leaf-l)', d: { bn: 'তার, পেরেক, বালু, ইট ইত্যাদি', en: 'Wire, nails, sand, bricks and more' } },
  bike: { n: { bn: 'মোটরসাইকেল', en: 'Motorcycle' }, icon: 'bike', cls: 'p-rod', color: 'var(--leaf)', bg: 'var(--leaf-l)', d: { bn: 'নতুন ও পুরাতন বাইক — মডেল, সাল, ইঞ্জিন/চেসিস নম্বর, আগের মালিক', en: 'New & used bikes — model, year, engine/chassis no., previous owner' } },
  car: { n: { bn: 'গাড়ি', en: 'Car' }, icon: 'car', cls: 'p-sky', color: 'var(--leaf)', bg: 'var(--leaf-l)', d: { bn: 'পুরাতন গাড়ি — মডেল, সাল, ইঞ্জিন/চেসিস নম্বর, রেজিস্ট্রেশন, আগের মালিক', en: 'Used cars — model, year, engine/chassis no., registration, previous owner' } },
  parts: { n: { bn: 'যন্ত্রাংশ ও এক্সেসরিজ', en: 'Parts & accessories' }, icon: 'gear', cls: 'p-angle', color: 'var(--pest)', bg: 'var(--pest-l)', d: { bn: 'হেলমেট, অয়েল, টায়ার, পার্টস', en: 'Helmets, oil, tyres, parts' } },
  brick: { n: { bn: 'ইট', en: 'Brick' }, icon: 'brick', cls: 'p-out', color: 'var(--berry)', bg: 'var(--berry-l)', d: { bn: '১ম, ২য় শ্রেণি, পিকেট — হাজার হিসাবে', en: '1st, 2nd class, picket — per thousand' } },
  khoa: { n: { bn: 'খোয়া', en: 'Khoa (crushed brick)' }, icon: 'stones', cls: 'p-rod', color: 'var(--soil)', bg: 'var(--soil-l)', d: { bn: 'ইটের খোয়া — সিএফটি হিসাবে', en: 'Crushed brick — per cft' } },
  block: { n: { bn: 'ব্লক', en: 'Block' }, icon: 'block', cls: 'p-cement', color: 'var(--muted)', bg: 'var(--surface2)', d: { bn: 'কংক্রিট ব্লক, হলো ব্লক — পিস হিসাবে', en: 'Concrete & hollow blocks — per piece' } },
  phone: { n: { bn: 'মোবাইল ফোন', en: 'Mobile phone' }, icon: 'phone', cls: 'p-sky', color: 'var(--sky)', bg: 'var(--sky-l)', d: { bn: 'স্মার্টফোন ও বাটন ফোন — ব্র্যান্ড ও মডেল', en: 'Smartphones & feature phones' } },
  accessory: { n: { bn: 'এক্সেসরিজ', en: 'Accessories' }, icon: 'headset', cls: 'p-angle', color: 'var(--pest)', bg: 'var(--pest-l)', d: { bn: 'চার্জার, কভার, হেডফোন, পাওয়ার ব্যাংক', en: 'Chargers, covers, headphones' } },
  electronics: { n: { bn: 'ইলেকট্রনিক্স', en: 'Electronics' }, icon: 'tv', cls: 'p-bar', color: 'var(--seed)', bg: 'var(--sun-l)', d: { bn: 'টিভি, ফ্যান, ফ্রিজ ও আরও', en: 'TV, fans, fridges and more' } },
  bed: { n: { bn: 'খাট', en: 'Bed' }, icon: 'bed', cls: 'p-rod', color: 'var(--soil)', bg: 'var(--soil-l)', d: { bn: 'কাঠের ও বোর্ডের খাট', en: 'Wooden & board beds' } },
  sofa: { n: { bn: 'সোফা', en: 'Sofa' }, icon: 'sofa', cls: 'p-sky', color: 'var(--sky)', bg: 'var(--sky-l)', d: { bn: 'সোফা সেট ও ডিভান', en: 'Sofa sets & divans' } },
  table: { n: { bn: 'টেবিল-চেয়ার', en: 'Table & chair' }, icon: 'table', cls: 'p-bar', color: 'var(--seed)', bg: 'var(--sun-l)', d: { bn: 'ডাইনিং, পড়ার টেবিল ও চেয়ার', en: 'Dining & study tables, chairs' } },
  almirah: { n: { bn: 'আলমারি', en: 'Almirah' }, icon: 'almirah', cls: 'p-angle', color: 'var(--pest)', bg: 'var(--pest-l)', d: { bn: 'আলমারি, ওয়ারড্রোব, শোকেস', en: 'Almirahs, wardrobes, showcases' } },
  door: { n: { bn: 'দরজা-জানালা', en: 'Doors & windows' }, icon: 'door', cls: 'p-cement', color: 'var(--muted)', bg: 'var(--surface2)', d: { bn: 'কাঠের দরজা, চৌকাঠ, জানালা', en: 'Wooden doors, frames, windows' } },
  pipe: { n: { bn: 'পাইপ', en: 'Pipe' }, icon: 'pipe', cls: 'p-sky', color: 'var(--sky)', bg: 'var(--sky-l)', d: { bn: 'পিভিসি, জিআই, পিপিআর পাইপ', en: 'PVC, GI, PPR pipes' } },
  fitting: { n: { bn: 'ফিটিংস', en: 'Fittings' }, icon: 'fitting', cls: 'p-cement', color: 'var(--muted)', bg: 'var(--surface2)', d: { bn: 'এলবো, টি, সকেট, ভালভ', en: 'Elbows, tees, sockets, valves' } },
  sanitary: { n: { bn: 'স্যানিটারি', en: 'Sanitary' }, icon: 'tap', cls: 'p-rod', color: 'var(--soil)', bg: 'var(--soil-l)', d: { bn: 'কমোড, বেসিন, কল, শাওয়ার', en: 'Commodes, basins, taps, showers' } },
  tiles: { n: { bn: 'টাইলস', en: 'Tiles' }, icon: 'tiles', cls: 'p-angle', color: 'var(--pest)', bg: 'var(--pest-l)', d: { bn: 'ফ্লোর ও ওয়াল টাইলস — বক্স হিসাবে', en: 'Floor & wall tiles — per box' } },
  paint: { n: { bn: 'রং', en: 'Paint' }, icon: 'paint', cls: 'p-out', color: 'var(--berry)', bg: 'var(--berry-l)', d: { bn: 'প্লাস্টিক, ইনামেল, ওয়েদারকোট', en: 'Plastic, enamel, weathercoat' } },
  electric: { n: { bn: 'ইলেকট্রিক', en: 'Electric' }, icon: 'bolt', cls: 'p-bar', color: 'var(--seed)', bg: 'var(--sun-l)', d: { bn: 'তার, সুইচ, সকেট, বাল্ব', en: 'Wire, switches, sockets, bulbs' } },
  tools: { n: { bn: 'যন্ত্রপাতি', en: 'Tools' }, icon: 'hammer', cls: 'p-rod', color: 'var(--soil)', bg: 'var(--soil-l)', d: { bn: 'হাতুড়ি, স্ক্রু ড্রাইভার, ড্রিল', en: 'Hammers, screwdrivers, drills' } },
  pest: { n: { bn: 'কীটনাশক', en: 'Pesticide' }, icon: 'spray', cls: 'p-pest', color: 'var(--pest)', bg: 'var(--pest-l)', d: { bn: 'কীটনাশক, ছত্রাকনাশক, আগাছানাশক — বোতল/প্যাকেট', en: 'Insecticide, fungicide, herbicide — by bottle or packet' } },
};
const MODULES = [
  { k: 'inv', icon: 'box', t: { bn: 'স্টক ও ইনভেন্টরি', en: 'Inventory & Stock' }, lock: true },
  { k: 'cat', icon: 'tag', t: { bn: 'পণ্য তালিকা', en: 'Items & Product Catalog' }, lock: true },
  { k: 'pur', icon: 'truck', t: { bn: 'ক্রয় ও ভেন্ডর বিল', en: 'Purchases & Vendor Bills' } },
  { k: 'sale', icon: 'cart', t: { bn: 'বিক্রি ও অর্ডার', en: 'Orders & Sales' }, lock: true },
  { k: 'invc', icon: 'receipt', t: { bn: 'ইনভয়েস / মেমো', en: 'Invoices' } },
  { k: 'due', icon: 'hand', t: { bn: 'বাকি ও জমা', en: 'Customer & vendor dues' } },
  { k: 'exp', icon: 'wallet', t: { bn: 'খরচ হিসাব', en: 'Expenses' } },
  { k: 'rep', icon: 'trend', t: { bn: 'লাভ-ক্ষতি রিপোর্ট', en: 'Profit & balance reports' } },
  { k: 'box', icon: 'box', t: { bn: 'বক্স / র‍্যাক নম্বর ট্র্যাকিং', en: 'Box / rack number tracking' } },
  { k: 'shop', icon: 'globe', t: { bn: 'কাস্টমার ওয়েবসাইট', en: 'Customer website' } },
];
const EXP = { rent: { bn: 'দোকান ভাড়া', en: 'Shop rent' }, salary: { bn: 'কর্মচারী বেতন', en: 'Staff salary' }, transport: { bn: 'পরিবহন', en: 'Transport' }, power: { bn: 'বিদ্যুৎ বিল', en: 'Electricity bill' }, tea: { bn: 'চা-নাস্তা', en: 'Tea & snacks' }, other: { bn: 'অন্যান্য', en: 'Other' } };
const PLAN_N = { trial: { bn: 'ফ্রি ট্রায়াল', en: 'Free trial' }, monthly: { bn: 'মাসিক', en: 'Monthly' }, yearly: { bn: 'বার্ষিক', en: 'Yearly' } };
const METHOD = { bkash: { bn: 'বিকাশ', en: 'bKash' }, nagad: { bn: 'নগদ', en: 'Nagad' }, rocket: { bn: 'রকেট', en: 'Rocket' }, cash: { bn: 'হাতে নগদ', en: 'Cash' }, bank: { bn: 'ব্যাংক', en: 'Bank' } };

/* ---------- App state ---------- */
const S = { me: null, otp: false, view: '', sup: null, cur: null, bid: null, wiz: null, q: '', sq: '', dq: '', users: null, revealed: {}, sms: null, pub: null };
const role = () => (S.pubSlug ? 'public' : !S.me ? 'guest' : S.me.role === 'super' && S.bid ? 'admin' : S.me.role);
const shopUrl = (slug) => (S.site && S.site.domain ? `https://${slug}.${S.site.domain}` : `${location.origin}/shop/${slug}`);
const publicUrl = (slug) => (S.site && S.site.domain ? `https://${slug}.${S.site.domain}/shop` : `${location.origin}/shop/${slug}`);
const appLink = () => (S.site && S.site.domain ? `https://${S.site.domain}${brand().page}` : `${location.origin}${brand().page}`);
const appCard = (who) => `<div class="card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-color:var(--sun)"><span style="font-size:1.6rem" aria-hidden="true">📱</span><div style="flex:1;min-width:200px"><b>${who === 'super' ? L('অ্যাপ ডাউনলোড ও প্রচারের লিংক', 'App download & promotion link') : N(brand().name) + ' ' + L('Android অ্যাপ', 'Android app')}</b><div class="muted" style="font-size:.88rem">${who === 'super' ? L('এই লিংক ফেসবুক/মেসেঞ্জারে শেয়ার করুন: ছোট বিজ্ঞাপন, ফ্রি ডেমো, অ্যাপ ডাউনলোড ও ব্যবহারের নিয়ম।', 'Share on Facebook/Messenger: short ad, free demo, app download and how-to.') : L('সেলারদের এই লিংক দিন — অ্যাপ নামিয়ে দোকানের ঠিকানা লিখলেই হবে।', 'Give this link to your sellers — download the app and type the shop address.')}</div><div class="urlbox" style="margin-top:6px">${esc(appLink())}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sun sm" data-copy="${esc(appLink())}">${L('লিংক কপি', 'Copy link')}</button><a class="btn ghost sm" href="${esc(appLink())}" target="_blank" rel="noopener">${I('globe')} ${L('খুলুন', 'Open')}</a><a class="btn ghost sm" href="${brand().apk}" download>${I('down')} APK</a></div></div>`;
const TYPE_CATS = { agri: ['seed', 'fert', 'pest'], build: ['rod', 'cement', 'tin', 'sheet', 'angle', 'bar', 'other'], bike: ['bike', 'parts'], brick: ['brick', 'khoa', 'block', 'other'],
  mobile: ['phone', 'accessory', 'electronics', 'other'], furniture: ['bed', 'sofa', 'table', 'almirah', 'door', 'other'], car: ['car', 'parts'], hardware: ['pipe', 'fitting', 'sanitary', 'tiles', 'paint', 'electric', 'tools', 'other'] };
// Units offered in the product form for each segment (KrishiKhata and NirmanKhata have their own lists).
const SEG_UNITS = { bike: ['piece', 'set', 'liter'], car: ['piece', 'set', 'liter'], brick: ['thousand', 'cft', 'piece'], mobile: ['piece', 'box', 'set'],
  furniture: ['piece', 'set'], hardware: ['piece', 'feet', 'meter', 'box', 'set', 'kg', 'liter', 'packet'] };
const VEHICLE_CATS = ['bike', 'car'];
const isVehicle = (p) => !!p && VEHICLE_CATS.includes(p.cat || p);
const BRAND = {
  agri: { name: { bn: 'কৃষিখাতা', en: 'KrishiKhata' }, sub: { bn: 'বীজ · সার · কীটনাশক ব্যবসা ব্যবস্থাপনা', en: 'Seed · Fertilizer · Pesticide business manager' },
    seller: { bn: 'বীজ, সার ও কীটনাশক বিক্রেতা', en: 'Seed, fertilizer & pesticide dealer' }, note: { bn: 'কীটনাশক ব্যবহারের আগে লেবেলের নির্দেশনা পড়ুন। ধন্যবাদ।', en: 'Read the label before using any pesticide. Thank you.' },
    search: { bn: 'যেমন: ইউরিয়া, ৫, B-05', en: 'e.g. urea, 5, B-05' }, hero: { bn: 'ভালো বীজ, সঠিক সার, নিরাপদ বালাইনাশক — আপনার ফসলের বিশ্বস্ত সঙ্গী।', en: 'Good seed, the right fertilizer, safe crop protection.' },
    login: { bn: 'বীজ, সার ও কীটনাশক ব্যবসার সহজ হিসাব', en: 'Simple accounts for seed, fertilizer and pesticide shops' }, apk: '/krishikhata.apk', page: '/app1', icon: 'leaf', num: 1 },
  build: { name: { bn: 'নির্মাণখাতা', en: 'NirmanKhata' }, sub: { bn: 'রড · সিমেন্ট · টিন · শিট · অ্যাঙ্গেল · বার ব্যবসা ব্যবস্থাপনা', en: 'Rod · Cement · Tin · Sheet · Angle · Bar business manager' },
    seller: { bn: 'রড, সিমেন্ট, টিন ও নির্মাণ সামগ্রী বিক্রেতা', en: 'Rod, cement, tin, sheet & building materials' }, note: { bn: 'মাল বুঝে নিয়ে মেমোটি সংরক্ষণ করুন। ধন্যবাদ।', en: 'Please check the goods and keep this memo. Thank you.' },
    search: { bn: 'যেমন: রড, সিমেন্ট, টিন, B-05', en: 'e.g. rod, cement, tin, B-05' }, hero: { bn: 'ভালো মানের রড, সিমেন্ট ও টিন — আপনার নির্মাণের বিশ্বস্ত সঙ্গী।', en: 'Quality rod, cement, tin and sheet for your building.' },
    login: { bn: 'রড, সিমেন্ট ও নির্মাণ সামগ্রী ব্যবসার সহজ হিসাব', en: 'Simple accounts for rod, cement and building-material shops' }, apk: '/nirmankhata.apk', page: '/app2', icon: 'build', num: 2 },
};
// The other segments (3–8): name, what they sell, invoice lines, colours.
[
  ['bike', 3, 'বাইকখাতা', 'BikeKhata', 'নতুন ও পুরাতন মোটরসাইকেল ব্যবসার হিসাব', 'New & used motorcycle business manager', 'মোটরসাইকেল ও যন্ত্রাংশ বিক্রেতা', 'Motorcycles & parts', 'যেমন: Pulsar, Honda, চেসিস নম্বর', 'e.g. Pulsar, Honda, chassis no.', 'ভালো বাইক, সঠিক কাগজপত্র — আপনার বিশ্বস্ত বাইক হাউজ।', 'Good bikes with proper papers.', 'bike', '#c2410c', '#9a3412'],
  ['brick', 4, 'ইটখাতা', 'ItKhata', 'ইট · খোয়া · ব্লক ব্যবসার হিসাব', 'Brick business manager', 'ইট, খোয়া ও ব্লক বিক্রেতা', 'Bricks, khoa & blocks', 'যেমন: ১ম শ্রেণি, খোয়া, B-05', 'e.g. 1st class, khoa, B-05', 'মজবুত ইট, সঠিক মাপ — আপনার নির্মাণের ভিত্তি।', 'Strong bricks for your building.', 'brick', '#b91c1c', '#7f1d1d'],
  ['mobile', 5, 'মোবাইলখাতা', 'MobileKhata', 'মোবাইল · এক্সেসরিজ · ইলেকট্রনিক্স ব্যবসার হিসাব', 'Mobile & electronics business manager', 'মোবাইল, এক্সেসরিজ ও ইলেকট্রনিক্স বিক্রেতা', 'Mobiles, accessories & electronics', 'যেমন: Samsung, চার্জার, B-05', 'e.g. Samsung, charger, B-05', 'আসল পণ্য, সঠিক দাম — আপনার বিশ্বস্ত মোবাইল শপ।', 'Genuine products at the right price.', 'phone', '#6d28d9', '#4c1d95'],
  ['furniture', 6, 'ফার্নিচারখাতা', 'FurnitureKhata', 'খাট · সোফা · টেবিল · আলমারি ব্যবসার হিসাব', 'Furniture business manager', 'কাঠের আসবাবপত্র বিক্রেতা', 'Wooden furniture', 'যেমন: খাট, সোফা, B-05', 'e.g. bed, sofa, B-05', 'টেকসই কাঠ, সুন্দর নকশা — আপনার ঘরের সৌন্দর্য।', 'Durable wood, beautiful design.', 'sofa', '#0f766e', '#134e4a'],
  ['car', 7, 'গাড়িখাতা', 'GariKhata', 'পুরাতন গাড়ি কেনা-বেচার হিসাব', 'Used car business manager', 'পুরাতন গাড়ি ক্রয়-বিক্রয়', 'Used car trading', 'যেমন: Axio, Premio, চেসিস নম্বর', 'e.g. Axio, Premio, chassis no.', 'যাচাই করা গাড়ি, পরিষ্কার কাগজপত্র।', 'Checked cars with clear papers.', 'car', '#1d4ed8', '#1e3a8a'],
  ['hardware', 8, 'হার্ডওয়্যারখাতা', 'HardwareKhata', 'হার্ডওয়্যার ও স্যানিটারি ব্যবসার হিসাব', 'Hardware & sanitary business manager', 'হার্ডওয়্যার, স্যানিটারি ও ইলেকট্রিক সামগ্রী', 'Hardware, sanitary & electric goods', 'যেমন: পাইপ, এলবো, B-05', 'e.g. pipe, elbow, B-05', 'সব ধরনের হার্ডওয়্যার ও স্যানিটারি এক জায়গায়।', 'All hardware & sanitary in one place.', 'wrench', '#0e7490', '#155e75'],
].forEach(([k, num, bnN, enN, subB, subE, selB, selE, srB, srE, heB, heE, icon, color, dark]) => {
  BRAND[k] = { name: { bn: bnN, en: enN }, sub: { bn: subB, en: subE }, seller: { bn: selB, en: selE }, note: { bn: 'পণ্য বুঝে নিয়ে মেমোটি সংরক্ষণ করুন। ধন্যবাদ।', en: 'Please check the goods and keep this memo. Thank you.' },
    search: { bn: srB, en: srE }, hero: { bn: heB, en: heE }, login: { bn: subB, en: subE }, apk: '/' + enN.toLowerCase() + '.apk', page: '/app' + num, icon, num, color, dark };
});
// Product details for building materials.
//  Rod, sheet, angle, bar: MS or SS + company, sold by weight (kg / ton).
//  Cement: company, by bag.   Tin: company + thickness + size in feet + pieces per bundle.
const STEEL_CO = ['BSRM', 'KSRM', 'AKS', 'GPH Ispat', 'Anwar Ispat', 'Rahim Steel', 'SAS Steel', 'Bashundhara', 'PHP', 'Abul Khair', 'KY Steel'];
const SPEC = {
  rod: { en: 'Rod', kinds: ['MS', 'SS'], units: ['kg', 'ton'], brands: STEEL_CO },
  cement: { en: 'Cement', units: ['bag', 'kg', 'ton'], brandReq: true, brands: ['Shah', 'Seven Rings', 'Bashundhara', 'Crown', 'Premier', 'Fresh', 'Akij', 'Meghna', 'Supercrete', 'Insee', 'Anwar', 'Royal', 'Tiger', 'Ruby'] },
  tin: { en: 'Tin', units: ['bundle', 'piece'], brandReq: true, pack: true, brands: ['PHP', 'KY Steel', 'Abul Khair', 'Appollo', 'Anwar', 'TK', 'S Alam', 'Bashundhara'],
    thick: ['0.12 mm', '0.14 mm', '0.16 mm', '0.18 mm', '0.20 mm', '0.22 mm', '0.25 mm', '0.28 mm', '0.32 mm', '0.36 mm', '0.42 mm', '0.46 mm', '0.51 mm'],
    dims: ['2.5 x 6 ft', '2.5 x 7 ft', '2.5 x 8 ft', '2.5 x 9 ft', '2.5 x 10 ft', '2.5 x 12 ft', '3 x 8 ft', '3 x 10 ft', '3 x 12 ft', '4 x 8 ft', '4 x 10 ft', '4 x 12 ft', '4 x 20 ft'] },
  sheet: { en: 'Sheet', kinds: ['MS', 'SS'], units: ['kg', 'ton'], brands: STEEL_CO },
  angle: { en: 'Angle', kinds: ['MS', 'SS'], units: ['kg', 'ton'], brands: STEEL_CO },
  bar: { en: 'Bar', kinds: ['MS', 'SS'], units: ['kg', 'ton'], brands: STEEL_CO },
  other: { en: '', units: ['piece', 'kg', 'ton', 'bag', 'bundle', 'feet', 'packet', 'liter'], brands: [] },
};
// "4*20", "4x20 ft", "৪ x ২০" → "4 x 20 ft";  "0.32" → "0.32 mm"
const normDims = (v) => { const t = toAscii(String(v || '')).trim(), m = t.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|')?\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')?$/i); return m ? `${+m[1]} x ${+m[2]} ft` : t; };
const normMm = (v) => { const t = toAscii(String(v || '')).trim(); return /^\d*\.?\d+$/.test(t) ? `${t} mm` : t.replace(/\s*mm$/i, ' mm'); };
// Name made from the details when the owner leaves it empty: "BSRM MS Rod", "Shah Cement", "PHP Tin 0.32 mm (4 x 20 ft)"
function autoNameOf(o) {
  const sp = SPEC[o.cat]; if (!sp || o.cat === 'other') return '';
  if (o.cat === 'tin') return [o.brand, 'Tin', normMm(o.size), o.dims && `(${normDims(o.dims)})`].filter(Boolean).join(' ');
  if (o.cat === 'cement') return [o.brand, 'Cement'].filter(Boolean).join(' ');
  return [o.brand, o.size, sp.en].filter(Boolean).join(' ');
}
// "PHP · 0.32 mm · 4 x 20 ft · 12 pcs/bundle"
const pspec = (p) => (p.meta && typeof vspec === 'function' ? vspec(p) : [p.brand && !String(p.name).includes(p.brand) ? p.brand : '', p.size && !String(p.name).includes(p.size) ? p.size : '', p.dims && !String(p.name).includes(p.dims) ? p.dims : '',
  p.perPack ? `${bn(p.perPack)} ${L('পিস', 'pcs')}/${U(p.unit)}` : ''].filter(Boolean).join(' · '));
const pspecOld = (p) => [p.brand && !String(p.name).includes(p.brand) ? p.brand : '', p.size && !String(p.name).includes(p.size) ? p.size : '', p.dims && !String(p.name).includes(p.dims) ? p.dims : '',
  p.perPack ? `${bn(p.perPack)} ${L('পিস', 'pcs')}/${U(p.unit)}` : ''].filter(Boolean).join(' · ');
// Selling tin by piece count: pieces ÷ pieces per bundle.
const pcsConv = (p) => (p && p.perPack > 0 && p.unit === 'bundle' ? 1 / p.perPack : 0);
const btype = () => (S.cur && S.cur.btype) || (S.sup && S.sup.btype) || (S.pub && S.pub.btype) || (S.site && ((S.site.shop && S.site.shop.btype) || S.site.btype)) || 'agri';
const brand = () => BRAND[btype()] || BRAND.agri;
const hasBox = (b) => (b.modules || []).includes('box');

/* ---------- API ---------- */
class ApiErr extends Error { constructor(msg, handled) { super(msg); this.handled = handled; } }
async function api(method, url, body) {
  let r;
  try {
    r = await fetch(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-KK': '1' }, body: body && method !== 'GET' ? JSON.stringify(body) : undefined });
  } catch (e) { toast(L('সার্ভারের সাথে সংযোগ হচ্ছে না। ইন্টারনেট দেখুন।', 'Cannot reach the server. Check the internet.'), 'err'); throw new ApiErr('network', true); }
  let data = {};
  try { data = await r.json(); } catch (e) {}
  if (r.status === 401 && !data.login && S.me) { S.me = null; S.cur = null; S.sup = null; toast(L('আবার লগইন করুন', 'Please sign in again'), 'err'); go('login'); throw new ApiErr('auth', true); }
  return { status: r.status, ok: r.ok, data };
}
const errText = (d) => (LANG === 'en' ? d.error_en || d.error : d.error || d.error_en) || L('কিছু একটা ভুল হয়েছে', 'Something went wrong');
const bizUrl = (p) => '/api/biz' + p + (S.bid ? (p.includes('?') ? '&' : '?') + 'bid=' + S.bid : '');

// Calls the API; handles the OTP step (HTTP 428) and shows errors. Resolves with data or throws ApiErr (already shown).
async function call(method, url, body = {}) {
  let res = await api(method, url, body), otp = null, err = '';
  for (;;) {
    if (res.status === 428 && res.data.otpRequired) { otp = res.data; err = ''; }
    else if (otp && res.status === 400 && res.data.otpRetry) { err = errText(res.data); }
    else break;
    const ans = await otpPrompt(otp, err);
    if (ans === null) { closeOtp(); throw new ApiErr('cancelled', true); }
    if (ans === 'resend') { res = await api(method, url, body); continue; }
    res = await api(method, url, { ...body, otpId: otp.otpId, otpCode: ans });
  }
  closeOtp();
  if (!res.ok) {
    if (res.data.needUnlock) { S.bid = null; S.cur = null; await loadSuper(); go('home'); }
    else if (res.data.locked) { await reload(); render(); }
    toast(errText(res.data), 'err'); throw new ApiErr('api', true);
  }
  return res.data;
}
// Runs an async action with the button disabled; swallows already-shown errors.
async function act(btn, fn) {
  if (btn) btn.disabled = true;
  try { return await fn(); }
  catch (e) { if (!(e instanceof ApiErr)) { console.error(e); toast(L('কিছু একটা ভুল হয়েছে', 'Something went wrong'), 'err'); } return undefined; }
  finally { if (btn && btn.isConnected) btn.disabled = false; }
}

/* ---------- OTP box ---------- */
let otpResolve = null;
function otpPrompt(o, err) {
  return new Promise((resolve) => {
    otpResolve = resolve;
    $('#otpm').innerHTML = `<div class="modal"><div class="box" role="dialog" aria-label="OTP" style="max-width:440px">
      <div class="inv-h"><div><h3>${I('shield')} ${L('OTP যাচাই', 'OTP check')}</h3><div style="opacity:.9">${esc(o.label || '')}</div></div></div>
      <div class="inv-b">
        <p style="margin:0">${L(`<b class="num">${esc(dg(o.to))}</b> নম্বরে ৬ সংখ্যার কোড SMS করা হয়েছে। বাংলা বা ইংরেজি সংখ্যায় লিখতে পারেন।`, `A 6-digit code was sent by SMS to <b class="num">${esc(o.to)}</b>.`)}</p>
        <input class="in otpin num" id="otp-in" inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="OTP">
        ${err ? `<div style="color:var(--berry);font-weight:600">${esc(err)}</div>` : ''}
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-otp="resend">${L('আবার পাঠান', 'Resend')}</button>
          <div style="display:flex;gap:8px"><button class="btn ghost" data-otp="cancel">${L('বাতিল', 'Cancel')}</button><button class="btn" data-otp="ok">${I('check')} ${L('যাচাই করুন', 'Verify')}</button></div></div>
      </div></div></div>`;
    setTimeout(() => $('#otp-in')?.focus(), 30);
  });
}
function otpAnswer(kind) {
  const r = otpResolve; if (!r) return; otpResolve = null;
  if (kind === 'ok') { const v = toAscii($('#otp-in').value.trim()); if (!/^\d{6}$/.test(v)) { otpResolve = r; return toast(L('৬ সংখ্যার কোড লিখুন', 'Enter the 6-digit code'), 'err'); } r(v); }
  else r(kind === 'resend' ? 'resend' : null);
}
const closeOtp = () => { $('#otpm').innerHTML = ''; otpResolve = null; };

/* ---------- Modals, confirm, toast ---------- */
const closeModal = () => { $('#modal').innerHTML = ''; };
function modal(head, body, opts = {}) {
  $('#modal').innerHTML = `<div class="modal" data-close><div class="box" role="dialog" aria-label="${esc(opts.label || '')}" style="max-width:${opts.width || 620}px">
    <div class="inv-h"><div>${head}</div>${opts.side || ''}</div><div class="inv-b">${body}</div></div></div>`;
  setTimeout(() => $('#modal input:not([type=hidden]):not([disabled])')?.focus(), 30);
}
let confirmResolve = null;
function ask(text, okText, danger) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    modal(`<h3>${I('alert')} ${L('নিশ্চিত করুন', 'Please confirm')}</h3>`, `<p style="margin:0">${text}</p>
      <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-confirm="no">${L('না', 'No')}</button><button class="btn ${danger ? 'red' : ''}" data-confirm="yes">${okText || L('হ্যাঁ', 'Yes')}</button></div>`, { width: 460 });
  });
}
function confirmAnswer(yes) { const r = confirmResolve; confirmResolve = null; closeModal(); if (r) r(yes); }
let toastT;
function toast(m, kind) { const t = $('#toast'); t.className = 'toast' + (kind === 'err' ? ' err' : ''); t.innerHTML = I(kind === 'err' ? 'alert' : 'check') + esc(m); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), kind === 'err' ? 4500 : 2800); }

/* ---------- Small view pieces ---------- */
function kpi(cls, ic, l, v, s) { return `<div class="kpi ${cls}"><div class="ico">${I(ic)}</div><div class="lbl">${l}</div><div class="val num">${v}</div><div class="sub">${s || ''}</div></div>`; }
const catPill = (k) => (CAT[k] ? `<span class="pill ${CAT[k].cls}">${I(CAT[k].icon)}${CN(k)}</span>` : '');
const subStateOf = (sub) => { if (sub.status === 'off') return 'off'; const d = daysTo(sub.expiry); return d < 0 ? 'expired' : d <= 7 ? 'soon' : 'active'; };
const isLockedSub = (sub) => ['off', 'expired'].includes(subStateOf(sub));
function subPill(sub) {
  const st = subStateOf(sub), d = daysTo(sub.expiry);
  const m = { active: ['p-ok', L('সক্রিয়', 'Active')], soon: ['p-low', L(`${bn(d)} দিন বাকি`, `${bn(d)} days left`)], expired: ['p-out', L('মেয়াদ শেষ', 'Expired')], off: ['p-out', L('বন্ধ করা', 'Deactivated')] }[st];
  return `<span class="pill ${m[0]}">● ${m[1]}</span>`;
}
const searchBar = (id, val, ph) => `<div class="searchbar">${I('search')}<input id="${id}" type="search" value="${esc(val)}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" autocomplete="off">${val ? `<button class="btn ghost sm" data-clearq="${id}" aria-label="${L('মুছুন', 'Clear')}">✕</button>` : ''}</div>`;
// Brand mark used in headings: leaf (KrishiKhata) or building (NirmanKhata).
const BI = () => I(brand().icon || 'leaf');
function heroScene() {
  if (btype() === 'build') return buildScene();
  if (btype() !== 'agri') return segScene();
  return `<svg class="scene" viewBox="0 0 420 200" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <circle cx="350" cy="50" r="26" fill="#ffd34d" opacity=".9"/><path d="M0 200 Q120 150 240 175 T420 160 V200Z" fill="#1a5a24" opacity=".6"/>
    <g fill="#bfe37a" opacity=".85">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<path d="M${150 + i * 28} 195 q-6 -30 0 -48 q6 18 0 48z"/><path d="M${150 + i * 28} 175 q-16 -10 -18 -26 q14 6 18 26z"/><path d="M${150 + i * 28} 168 q14 -12 18 -26 q-14 6 -18 26z"/>`).join('')}</g>
    <rect x="368" y="110" width="9" height="70" fill="#5a3a1b"/><circle cx="372" cy="100" r="30" fill="#3f9b3f"/><circle cx="350" cy="115" r="20" fill="#4fae46"/><circle cx="394" cy="115" r="20" fill="#2f8a35"/></svg>`;
}

/* ---------- Loading data ---------- */
async function loadBiz() { S.cur = await call('GET', bizUrl('/state')); }
async function loadSuper() { S.sup = await call('GET', '/api/super/state'); }
async function reload() { if (role() === 'super') await loadSuper(); else if (S.me) await loadBiz(); }

/* ---------- Navigation & chrome ---------- */
function navList() {
  const b = S.cur;
  const has = (m) => !b || (b.modules || []).includes(m);
  return {
    super: [['home', 'dash', L('সব ব্যবসা', 'All businesses')], ['subs', 'money', L('সাবস্ক্রিপশন', 'Subscriptions')], ['users', 'users', L('ইউজার ও পাসওয়ার্ড', 'Users & passwords')], ['sms', 'phone', L('SMS / OTP লগ', 'SMS / OTP log')], ['settings', 'gear', L('সেটিংস ও OTP', 'Settings & OTP')], ['wizard', 'plus', L('নতুন সেটআপ', 'New setup')]],
    admin: [['dash', 'dash', L('ড্যাশবোর্ড', 'Dashboard')], ['sale', 'cart', L('নতুন বিক্রি', 'New sale')], ['stock', 'box', L('স্টক', 'Stock')], b && b.cats.some(isVehicle) && ['vehicles', b.cats.includes('car') ? 'car' : 'bike', b.cats.includes('car') ? L('গাড়ি রেজিস্টার', 'Car register') : L('বাইক রেজিস্টার', 'Bike register')], ['catalog', 'tag', L('পণ্য তালিকা', 'Products')],
      has('pur') && ['purchase', 'truck', L('ক্রয় ও ভেন্ডর বিল', 'Purchases & bills')], ['orders', 'receipt', L('অর্ডার ও ইনভয়েস', 'Orders & invoices')], has('due') && ['dues', 'hand', L('বাকি হিসাব', 'Dues')],
      has('exp') && ['expense', 'wallet', L('খরচ', 'Expenses')], has('rep') && ['report', 'trend', L('লাভ-ক্ষতি', 'Profit & loss')], ['team', 'users', L('সেলার ও সেটিংস', 'Sellers & access')],
      has('shop') && ['shop', 'globe', L('কাস্টমার ওয়েবসাইট', 'Customer website')], ['billing', 'crown', L('আমার সাবস্ক্রিপশন', 'My subscription')]].filter(Boolean),
    seller: [['sale', 'cart', L('নতুন বিক্রি', 'New sale')], b && b.cats.some(isVehicle) && ['vehicles', b.cats.includes('car') ? 'car' : 'bike', b.cats.includes('car') ? L('গাড়ি রেজিস্টার', 'Car register') : L('বাইক রেজিস্টার', 'Bike register')], ['mysales', 'receipt', L('আমার বিক্রি', 'My sales')], ['account', 'user', L('আমার অ্যাকাউন্ট', 'My account')]].filter(Boolean),
  };
}
// Segments 3–8: the segment's own picture, drawn large and soft on the right, with a sun.
function segScene() {
  if (['bike', 'brick', 'mobile', 'furniture', 'car', 'hardware'].includes(btype())) return `<img class="scene" src="/art/${btype()}.svg" alt="" aria-hidden="true">`;
  return `<svg class="scene" viewBox="0 0 420 200" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <circle cx="330" cy="52" r="26" fill="#ffd34d" opacity=".85"/><path d="M120 200 Q260 150 420 172 V200Z" fill="#000" opacity=".12"/>
    <g transform="translate(250 70) scale(5.4)" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".9">${P[brand().icon] || ''}</g></svg>`;
}
// NirmanKhata hero: a small skyline with a building going up and a tower crane.
function buildScene() {
  const win = (x, y, cols, rows) => Array.from({ length: cols * rows }, (_, i) => `<rect x="${x + (i % cols) * 12}" y="${y + Math.floor(i / cols) * 14}" width="6" height="8" rx="1"/>`).join('');
  return `<svg class="scene" viewBox="0 0 420 200" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <circle cx="300" cy="46" r="24" fill="#ffd34d" opacity=".9"/>
    <rect x="150" y="118" width="46" height="82" rx="2" fill="#f6d7bf" opacity=".9"/><rect x="202" y="84" width="58" height="116" rx="2" fill="#fde9d7"/><rect x="266" y="132" width="40" height="68" rx="2" fill="#efbf9a" opacity=".95"/>
    <g fill="#a8532b" opacity=".45">${win(158, 128, 3, 5)}${win(212, 96, 4, 7)}${win(274, 142, 2, 4)}</g>
    <g fill="none" stroke="#fff" stroke-width="2.4" opacity=".9"><path d="M318 200V128h52v72M318 150h52M318 172h52M335 128v72M352 128v72"/></g>
    <g fill="none" stroke="#ffd34d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M392 200V30M384 200l8-12 8 12M392 30h-110M392 30h22M392 30l-30 14M392 30l18 10M300 30v34"/></g>
    <rect x="292" y="64" width="16" height="10" rx="2" fill="#ffd34d"/><rect x="408" y="28" width="12" height="12" fill="#ffd34d"/>
    <path d="M0 200h420v-6H0z" fill="#5c2a12" opacity=".5"/></svg>`;
}
// Segments 3–8 take their colour from BRAND: the CSS reads --brand, --brand-d, --brand-l and the dark-mode tints.
const mixHex = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
function applyBrandColors() {
  const st = document.documentElement.style, B = brand();
  for (const v of ['--brand', '--brand-d', '--brand-l', '--brand-2', '--brand-lt', '--brand-lt2', '--brand-dl']) st.removeProperty(v);
  document.documentElement.dataset.palette = B.color ? 'seg' : '';
  if (!B.color) return;
  st.setProperty('--brand', B.color); st.setProperty('--brand-d', B.dark); st.setProperty('--brand-l', mixHex(B.color, '#ffffff', 0.86));
  st.setProperty('--brand-2', mixHex(B.color, '#ffffff', 0.35)); st.setProperty('--brand-lt', mixHex(B.color, '#ffffff', 0.38));
  st.setProperty('--brand-lt2', mixHex(B.color, '#ffffff', 0.6)); st.setProperty('--brand-dl', mixHex(B.color, '#000000', 0.68));
}
function renderChrome() {
  const r = role();
  document.documentElement.lang = LANG === 'bn' ? 'bn' : 'en';
  document.title = N(brand().name);
  const logo = document.querySelector('.brand .logo');
  if (logo.dataset.b !== btype()) {
    document.documentElement.dataset.brand = btype();
    logo.dataset.b = btype();
    applyBrandColors();
    logo.innerHTML = !['agri', 'build'].includes(btype())
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[brand().icon] || ''}</svg>`
      : btype() === 'build'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-5h6v5M9 12h6"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21c.5-6 3-10 9-13"/><path d="M20 3c-9 0-15 4-15 11 0 2 1 4 1 4s9 1 12-7c1-3 2-8 2-8z" fill="currentColor" fill-opacity=".2"/></svg>';
  }
  $('#brandname').textContent = N(brand().name);
  $('#brandsub').textContent = N(brand().sub);
  const bz = $('#bizname');
  bz.hidden = r === 'guest' || r === 'public';
  bz.innerHTML = r === 'super' ? `${I('crown')} ${L('মাদার প্যানেল', 'Mother panel')}` : S.cur ? `${I('build')} ${esc(S.cur.name)}${S.cur.demo ? ` · ${L('ডেমো', 'Demo')}` : ''}` : '';
  const ub = $('#userbar');
  ub.hidden = !S.me;
  if (S.me) ub.innerHTML = (S.bid ? `<button data-backsuper>${I('back')} ${L('মাদার প্যানেল', 'Mother panel')}</button>` : '') +
    `<button class="on" disabled>${I(S.me.role === 'super' ? 'crown' : S.me.role === 'admin' ? 'shield' : 'user')} <span class="uname">${esc(S.me.name)}</span></button><button data-logout title="${L('লগআউট', 'Sign out')}">${I('out')} ${L('লগআউট', 'Sign out')}</button>`;
  const bell = $('#bellbtn');
  if (r === 'admin' && S.cur) { const n = (S.cur.notes || []).filter((x) => !x.read).length; bell.hidden = false; bell.innerHTML = I('bell') + (n ? `<span class="badge">${bn(n)}</span>` : ''); bell.setAttribute('aria-label', L(`নোটিফিকেশন (${bn(n)} নতুন)`, `Notifications (${n} new)`)); }
  else bell.hidden = true;
  $('#langbtn').innerHTML = `${I('lang')} <span class="lfull">${LANG === 'bn' ? 'English' : 'বাংলা'}</span><span class="lshort">${LANG === 'bn' ? 'EN' : 'বাং'}</span>`;
  $('#langbtn').setAttribute('aria-label', LANG === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন');
  $('#themebtn').setAttribute('aria-label', L('লাইট / ডার্ক থিম', 'Light / dark theme'));
  const showSide = r !== 'guest' && r !== 'public';
  $('#side').hidden = !showSide;
  $('#shell').classList.toggle('noside', !showSide);
  $('#sidehead').textContent = r === 'super' ? L('মাদার সফটওয়্যার', 'Mother software') : r === 'admin' ? L('অ্যাডমিন মেনু', 'Admin menu') : L('সেলার মেনু', 'Seller menu');
  let items = showSide ? navList()[r] || [] : [];
  if ((r === 'admin' || r === 'seller') && S.cur && S.cur.locked) items = r === 'admin' ? [['billing', 'crown', L('আমার সাবস্ক্রিপশন', 'My subscription')]] : [];
  $('#nav').innerHTML = items.map(([k, ic, t]) => `<button class="${S.view === k ? 'on' : ''}" data-nav="${k}"><span class="ic">${I(ic)}</span>${t}</button>`).join('');
}
const VIEWS = {};
const after = {};
function render() {
  applyDefaultLang();
  renderChrome();
  const r = role();
  let v = S.view;
  if (r === 'guest') v = 'login';
  else if (r === 'public') v = 'public';
  else if ((r === 'admin' || r === 'seller') && S.cur && S.cur.locked && !(r === 'admin' && v === 'billing')) v = 'locked';
  const fn = VIEWS[v] || VIEWS[r === 'super' ? 'home' : r === 'seller' ? 'sale' : 'dash'];
  $('#main').innerHTML = fn();
  after[v]?.();
}
function go(v) { S.view = v; render(); window.scrollTo({ top: 0 }); }
