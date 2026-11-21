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
  edit:'<path d="M4 20h4L20 8l-4-4L4 16z"/>', trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};
const I = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- Language & formatting ---------- */
let LANG = 'bn';
try { LANG = localStorage.getItem('kk-lang') || 'bn'; } catch (e) {}
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

const UNIT = { kg: { bn: 'কেজি', en: 'kg' }, bag: { bn: 'বস্তা', en: 'bag' }, bottle: { bn: 'বোতল', en: 'bottle' }, packet: { bn: 'প্যাকেট', en: 'packet' }, liter: { bn: 'লিটার', en: 'litre' } };
const U = (u) => N(UNIT[u] || u);
const CAT = {
  seed: { n: { bn: 'বীজ', en: 'Seed' }, icon: 'seed', cls: 'p-seed', color: 'var(--seed)', bg: 'var(--sun-l)', d: { bn: 'ধান, ভুট্টা, সবজি, পাট বীজ — প্যাকেট/কেজি হিসাবে', en: 'Rice, maize, vegetable, jute seed — by packet or kg' } },
  fert: { n: { bn: 'সার', en: 'Fertilizer' }, icon: 'sack', cls: 'p-fert', color: 'var(--fert)', bg: 'var(--sky-l)', d: { bn: 'ইউরিয়া, টিএসপি, এমওপি, জিপসাম — বস্তা/কেজি হিসাবে', en: 'Urea, TSP, MOP, gypsum — by bag or kg' } },
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
  if (!res.ok) { if (res.data.locked) { await reload(); render(); } toast(errText(res.data), 'err'); throw new ApiErr('api', true); }
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
const catPill = (k) => `<span class="pill ${CAT[k].cls}">${I(CAT[k].icon)}${N(CAT[k].n)}</span>`;
const subStateOf = (sub) => { if (sub.status === 'off') return 'off'; const d = daysTo(sub.expiry); return d < 0 ? 'expired' : d <= 7 ? 'soon' : 'active'; };
const isLockedSub = (sub) => ['off', 'expired'].includes(subStateOf(sub));
function subPill(sub) {
  const st = subStateOf(sub), d = daysTo(sub.expiry);
  const m = { active: ['p-ok', L('সক্রিয়', 'Active')], soon: ['p-low', L(`${bn(d)} দিন বাকি`, `${bn(d)} days left`)], expired: ['p-out', L('মেয়াদ শেষ', 'Expired')], off: ['p-out', L('বন্ধ করা', 'Deactivated')] }[st];
  return `<span class="pill ${m[0]}">● ${m[1]}</span>`;
}
const searchBar = (id, val, ph) => `<div class="searchbar">${I('search')}<input id="${id}" type="search" value="${esc(val)}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" autocomplete="off">${val ? `<button class="btn ghost sm" data-clearq="${id}" aria-label="${L('মুছুন', 'Clear')}">✕</button>` : ''}</div>`;
function heroScene() {
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
    admin: [['dash', 'dash', L('ড্যাশবোর্ড', 'Dashboard')], ['sale', 'cart', L('নতুন বিক্রি', 'New sale')], ['stock', 'box', L('স্টক', 'Stock')], ['catalog', 'tag', L('পণ্য তালিকা', 'Products')],
      has('pur') && ['purchase', 'truck', L('ক্রয় ও ভেন্ডর বিল', 'Purchases & bills')], ['orders', 'receipt', L('অর্ডার ও ইনভয়েস', 'Orders & invoices')], has('due') && ['dues', 'hand', L('বাকি হিসাব', 'Dues')],
      has('exp') && ['expense', 'wallet', L('খরচ', 'Expenses')], has('rep') && ['report', 'trend', L('লাভ-ক্ষতি', 'Profit & loss')], ['team', 'users', L('সেলার ও সেটিংস', 'Sellers & access')],
      has('shop') && ['shop', 'globe', L('কাস্টমার ওয়েবসাইট', 'Customer website')], ['billing', 'crown', L('আমার সাবস্ক্রিপশন', 'My subscription')]].filter(Boolean),
    seller: [['sale', 'cart', L('নতুন বিক্রি', 'New sale')], ['mysales', 'receipt', L('আমার বিক্রি', 'My sales')], ['account', 'user', L('আমার অ্যাকাউন্ট', 'My account')]],
  };
}
function renderChrome() {
  const r = role();
  document.documentElement.lang = LANG === 'bn' ? 'bn' : 'en';
  document.title = L('কৃষিখাতা', 'KrishiKhata');
  $('#brandname').textContent = L('কৃষিখাতা', 'KrishiKhata');
  $('#brandsub').textContent = L('বীজ · সার · কীটনাশক ব্যবসা ব্যবস্থাপনা', 'Seed · Fertilizer · Pesticide business manager');
  const bz = $('#bizname');
  bz.hidden = r === 'guest' || r === 'public';
  bz.innerHTML = r === 'super' ? `${I('crown')} ${L('মাদার প্যানেল', 'Mother panel')}` : S.cur ? `${I('build')} ${esc(S.cur.name)}` : '';
  const ub = $('#userbar');
  ub.hidden = !S.me;
  if (S.me) ub.innerHTML = (S.bid ? `<button data-backsuper>${I('back')} ${L('মাদার প্যানেল', 'Mother panel')}</button>` : '') +
    `<button class="on" disabled>${I(S.me.role === 'super' ? 'crown' : S.me.role === 'admin' ? 'shield' : 'user')} <span class="uname">${esc(S.me.name)}</span></button><button data-logout title="${L('লগআউট', 'Sign out')}">${I('out')} ${L('লগআউট', 'Sign out')}</button>`;
  const bell = $('#bellbtn');
  if (r === 'admin' && S.cur) { const n = (S.cur.notes || []).filter((x) => !x.read).length; bell.hidden = false; bell.innerHTML = I('bell') + (n ? `<span class="badge">${bn(n)}</span>` : ''); bell.setAttribute('aria-label', L(`নোটিফিকেশন (${bn(n)} নতুন)`, `Notifications (${n} new)`)); }
  else bell.hidden = true;
  $('#langbtn').innerHTML = `${I('lang')} ${LANG === 'bn' ? 'English' : 'বাংলা'}`;
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
