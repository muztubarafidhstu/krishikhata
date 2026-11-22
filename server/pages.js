'use strict';
// Public marketing pages: the home page listing every software, /app3 … /app8 for the newer segments,
// and two pieces shared by every page — "go to my shop" and "all our software".
const { SEGMENTS } = require('./segments');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bnNum = (n) => Math.round(n).toLocaleString('bn-BD');

// Styles for the shared blocks; each page sets --seg (its colour) and --seg-d.
const SHARED_CSS = `
.finder{margin:26px auto 0;max-width:1060px;padding:0 max(18px,env(safe-area-inset-left,0px))}
.finder form{background:var(--card,#fff);border:2px solid var(--seg);border-radius:22px;padding:18px 20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;box-shadow:0 14px 34px -20px rgba(0,0,0,.45)}
.finder .ic{font-size:2rem}
.finder .t{flex:1 1 260px}
.finder .t b{display:block;font-family:var(--display);font-size:1.2rem}
.finder .t span{color:var(--mu,#5d6675);font-size:.92rem}
.finder .row{display:flex;gap:8px;flex:1 1 300px;min-width:0}
@media (max-width:560px){.finder .row{flex-basis:100%}.finder button{padding:12px 14px}.finder form{padding:16px}}
.finder input{flex:1;min-width:0;border:2px solid var(--line,#dde3ea);border-radius:14px;padding:12px 14px;font:inherit;font-size:1.05rem;background:var(--bg,#fff);color:inherit}
.finder input:focus{outline:none;border-color:var(--seg)}
.finder button{border:0;border-radius:14px;padding:12px 18px;font:700 1.02rem/1 var(--display);background:var(--seg);color:#fff;cursor:pointer;white-space:nowrap;box-shadow:0 3px 0 var(--seg-d)}
.finder .nf{flex-basis:100%;color:#c8414f;font-weight:700;margin:0}
.allapps{max-width:1060px;margin:34px auto 0;padding:0 max(18px,env(safe-area-inset-left,0px))}
.allapps h2{font-family:var(--display);font-size:1.5rem;margin:0 0 4px}
.allapps p.sub{margin:0 0 14px;color:var(--mu,#5d6675)}
.apps{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.apps a{display:flex;gap:12px;align-items:center;text-decoration:none;background:var(--card,#fff);color:inherit;border:1px solid var(--line,#dde3ea);border-radius:18px;padding:12px 14px;box-shadow:0 8px 20px -16px rgba(0,0,0,.5);transition:transform .15s}
.apps a:hover{transform:translateY(-2px)}
.apps a.cur{outline:2px solid var(--seg)}
.apps .em{width:48px;height:48px;flex:none;border-radius:14px;display:grid;place-items:center;font-size:1.6rem;color:#fff}
.apps b{display:block;font-family:var(--display);font-size:1.08rem;line-height:1.2}
.apps small{display:block;color:var(--mu,#5d6675);font-size:.8rem;line-height:1.35}
.apps .n{font-size:.75rem;font-weight:700;color:var(--mu,#5d6675)}
`;

// "Already a customer? Go to your shop": shop name or mobile number → /go → that shop's own address.
const finderHTML = (nf) => `<div class="finder" id="finder"><form action="/go" method="get">
  <span class="ic" aria-hidden="true">🏪</span>
  <div class="t"><b>আগেই গ্রাহক? নিজের দোকানে যান</b><span>দোকানের নাম (যেমন karim) অথবা আপনার মোবাইল নম্বর (আইডি) লিখুন</span></div>
  <div class="row"><input name="q" required maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="karim বা 01XXXXXXXXX" aria-label="দোকানের নাম বা মোবাইল নম্বর"><button type="submit">আমার দোকান →</button></div>
  ${nf ? '<p class="nf">এই নাম বা নম্বরে কোনো দোকান পাওয়া যায়নি। বানান দেখে আবার লিখুন, অথবা WhatsApp করুন।</p>' : ''}
</form></div>`;

const allAppsHTML = (current, prices) => `<section class="allapps" id="all"><h2>আমাদের সব সফটওয়্যার</h2><p class="sub">যে ব্যবসা, সেই অনুযায়ী আলাদা অ্যাপ — সবগুলোতে ${bnNum(14)} দিন ফ্রি</p>
  <div class="apps">${SEGMENTS.map((s) => `<a href="/app${s.num}" class="${s.key === current ? 'cur' : ''}"><span class="em" style="background:${s.color}">${s.emoji}</span>
    <span><span class="n">${bnNum(s.num)}</span> <b>${esc(s.bn)}</b><small>${esc(s.what.bn)}</small><small>৳${bnNum(prices[s.key].monthly)} / মাস</small></span></a>`).join('')}</div></section>`;

const HEAD = (title, desc, color, base, path, extra = '') => `<!doctype html><html lang="bn"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"><meta name="theme-color" content="${color}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${base}${path}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@500;600;700;800&text=%E0%A7%A6%E0%A7%A7%E0%A7%A8%E0%A7%A9%E0%A7%AA%E0%A7%AB%E0%A7%AC%E0%A7%AD%E0%A7%AE%E0%A7%AF%E0%A7%B3&display=swap">${extra}`;

const BASE_CSS = (s) => `
:root{--seg:${s.color};--seg-d:${s.dark};--bg:#f4f6f9;--fg:#1d2430;--mu:#5d6675;--line:#dde3ea;--card:#fff;--wa:#25d366;--wa-d:#128c4a;
  --display:"Noto Sans Bengali","Baloo Da 2","Hind Siliguri",system-ui,sans-serif;--body:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif}
@media (prefers-color-scheme: dark){:root{--bg:#0f1318;--fg:#e7ebf0;--mu:#9aa5b4;--line:#2a333d;--card:#171c23}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--body);font-size:16px;line-height:1.6}
a{color:inherit}h1,h2,h3{font-family:var(--display);line-height:1.2;margin:0}
.wrap{max-width:1060px;margin:0 auto;padding-left:max(18px,env(safe-area-inset-left,0px));padding-right:max(18px,env(safe-area-inset-right,0px))}
.hero{color:#fff;background:radial-gradient(120% 90% at 85% 0%,${s.color} 0%,${s.dark} 70%);padding:26px 0 40px;position:relative;overflow:hidden}
.hero::after{content:"${s.emoji}";position:absolute;right:-30px;bottom:-60px;font-size:260px;opacity:.09;pointer-events:none}
.hero .wrap{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:28px;align-items:center;position:relative;z-index:1}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.logo{width:56px;height:56px;border-radius:16px;background:#fff;display:grid;place-items:center;font-size:1.8rem;box-shadow:inset 0 -5px 0 #f2a516}
.brand b{display:block;font-family:var(--display);font-size:1.9rem;line-height:1}.brand small{opacity:.9}
.badge{display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:4px 14px;font-weight:600;font-size:.9rem}
h1{font-size:clamp(1.9rem,4.6vw,2.9rem);margin:14px 0 10px}h1 em{font-style:normal;color:#ffd34d}
.lead{font-size:1.08rem;opacity:.95;margin:0 0 18px;max-width:56ch}
.btns{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:14px;padding:13px 18px;font:700 1.05rem/1 var(--display);text-decoration:none;border:0;cursor:pointer}
.btn svg{width:22px;height:22px}
.btn.wa{background:var(--wa);color:#05361a;box-shadow:0 4px 0 var(--wa-d)}
.btn.dl{background:#ffd34d;color:#3a2700;box-shadow:0 4px 0 #b98d0b}
.btn.ghost{background:var(--card);color:var(--fg);border:1px solid var(--line)}
.meta{display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;font-size:.9rem;opacity:.92}.meta span::before{content:"✓ ";color:#ffd34d;font-weight:800}
.phone{justify-self:center;width:250px;border-radius:34px;background:#0d1117;padding:10px;box-shadow:0 30px 60px -20px rgba(0,0,0,.6)}
.phone img{display:block;width:100%;border-radius:25px}
section{margin-top:40px}.eyebrow{color:var(--seg);font-weight:800;font-size:.9rem}
h2{font-size:clamp(1.4rem,3vw,1.9rem);margin:2px 0 14px}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.vs .col{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px}
.vs .bad{border-color:#f3b4bb}.vs .good{border-color:var(--seg)}
.vs ul{margin:8px 0 0;padding-left:20px}.vs li{margin:4px 0}
.feats{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.feats div{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px}
.feats .e{font-size:1.9rem}.feats b{display:block;font-family:var(--display);font-size:1.15rem;color:var(--seg)}
.prices{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.price{background:var(--card);border:2px solid var(--line);border-radius:22px;padding:18px;text-align:center}
.price.best{border-color:var(--seg)}
.price .amt{font-family:var(--display);font-size:2.4rem;font-weight:800;color:var(--seg)}
.demo{background:var(--card);border:2px dashed var(--seg);border-radius:20px;padding:16px 18px;display:grid;gap:4px}
.demo code{font:700 1.1rem ui-monospace,Menlo,monospace;color:var(--seg)}
.steps{counter-reset:s;list-style:none;padding:0;display:grid;gap:10px}
.steps li{counter-increment:s;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px 12px 56px;position:relative}
.steps li::before{content:counter(s);position:absolute;left:14px;top:12px;width:30px;height:30px;border-radius:50%;background:var(--seg);color:#fff;display:grid;place-items:center;font-weight:800}
.steps b{display:block}
.cta{margin-top:40px;text-align:center;background:radial-gradient(120% 90% at 85% 0%,${s.color} 0%,${s.dark} 80%);color:#fff;border-radius:26px;padding:28px 20px}
.cta .btns{justify-content:center;margin-top:12px}
footer{text-align:center;color:var(--mu);font-size:.85rem;padding:30px 0 calc(100px + env(safe-area-inset-bottom,0px))}
.float{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:50;display:flex;align-items:center;gap:8px;background:var(--wa);color:#05361a;text-decoration:none;font-weight:800;border-radius:99px;padding:12px 18px;box-shadow:0 10px 24px -8px rgba(0,0,0,.45)}
.float svg{width:28px;height:28px}
@media (max-width:760px){.hero .wrap{grid-template-columns:minmax(0,1fr)}.phone{width:210px}.vs{grid-template-columns:minmax(0,1fr)}.float span{display:none}.float{padding:14px}}
${SHARED_CSS}`;

const DL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12M6 11l6 6 6-6M4 20h16"/></svg>';

// /app3 … /app8: one page per newer segment, from segments.js.
function segPage(s, v) {
  const P = v.P, isV = ['bike', 'car'].includes(s.key);
  return `${HEAD(`${s.bn} — ${s.what.bn} ব্যবসার হিসাবের অ্যাপ`, `${s.what.bn} — বিক্রি, ক্যাশ মেমো, স্টক, বাকি ও লাভ-ক্ষতি মোবাইলে। ${bnNum(P.trialDays)} দিন ফ্রি।`, s.color, v.base, '/app' + s.num, `<link rel="icon" href="/icon-${s.key}.svg" type="image/svg+xml">`)}
<style>${BASE_CSS(s)}</style></head><body>
<header class="hero"><div class="wrap"><div>
  <div class="brand"><div class="logo" aria-hidden="true">${s.emoji}</div><div><b>${esc(s.bn)}</b><small>${esc(s.what.bn)}</small></div></div>
  <span class="badge">${s.emoji} বাংলাদেশের ${esc(s.what.bn)} ব্যবসার জন্য বানানো</span>
  <h1>খাতা-কলম ছাড়ুন, দোকানের <em>সব হিসাব মোবাইলে</em></h1>
  <p class="lead">${isV ? `প্রতিটি ${s.key === 'car' ? 'গাড়ির' : 'বাইকের'} ইঞ্জিন/চেসিস নম্বর, কেনা ও বিক্রির তারিখ, আগের মালিক আর লাভ — সব এক জায়গায়, এক চাপে খুঁজে পান।` : 'কে কত বাকি, কোন মাল কত আছে, আজ কত বিক্রি, মাস শেষে কত লাভ — এক চাপে দেখুন।'} বাংলায়, সহজে।</p>
  <div class="btns"><a class="btn wa" href="${v.waTrial}" target="_blank" rel="noopener">${v.WA}${bnNum(P.trialDays)} দিন ফ্রি শুরু করুন</a>
    <a class="btn dl" href="/${s.apk}" download="${s.apk}">${DL_ICON}অ্যাপ ডাউনলোড</a></div>
  <div class="meta"><span>${bnNum(P.trialDays)} দিন ফ্রি</span><span>মাসিক মাত্র ৳${bnNum(P.monthly)}</span><span>কোনো সেটআপ খরচ নেই</span><span>মোবাইল ও কম্পিউটারে</span></div>
</div><div class="phone"><img src="/app-screen-${s.key}.jpg" alt="${esc(s.bn)} অ্যাপের পেজ" width="390" height="780"></div></div></header>
${finderHTML(v.nf)}
<main class="wrap">
  <section><div class="eyebrow">সমস্যা চেনেন তো?</div><h2>খাতায় হিসাব রাখলে প্রতি মাসে টাকা হারায়</h2>
    <div class="vs"><div class="col bad"><h3>📒 খাতা-কলমে</h3><ul>${(s.pains || []).map((x) => `<li>${esc(x)}</li>`).join('')}<li>খাতা হারালে বা ভিজলে সব হিসাব শেষ</li></ul></div>
    <div class="col good"><h3>📱 ${esc(s.bn)}য়</h3><ul>${(s.feats || []).slice(0, 4).map(([, b, t]) => `<li><b>${esc(b)}</b> — ${esc(t)}</li>`).join('')}<li>হিসাব থাকে অনলাইনে, প্রতি রাতে ব্যাকআপ — ফোন হারালেও কিছু হারায় না</li></ul></div></div></section>
  <section><div class="eyebrow">যা যা পাবেন</div><h2>এক অ্যাপেই সব কাজ</h2>
    <div class="feats">${(s.feats || []).map(([e, b, t]) => `<div><span class="e">${e}</span><b>${esc(b)}</b>${esc(t)}</div>`).join('')}
      <div><span class="e">👥</span><b>৩ জন সেলার</b>প্রত্যেকের আলাদা আইডি — সেলাররা লাভ দেখতে পারে না</div>
      <div><span class="e">🌐</span><b>নিজস্ব ওয়েবসাইট</b>যেমন yourshop.${esc(v.domain)} — ক্রেতারা পণ্য ও দাম দেখবে</div></div></section>
  <section id="price"><div class="eyebrow">দাম</div><h2>সহজ দাম, কোনো লুকানো খরচ নেই</h2>
    <div class="prices"><div class="price"><div>ফ্রি ট্রায়াল</div><div class="amt">${bnNum(P.trialDays)} দিন</div><div>সব সুবিধা চালু</div></div>
      <div class="price best"><div>মাসিক</div><div class="amt">৳${bnNum(P.monthly)}</div><div>প্রতি মাসে</div></div>
      <div class="price"><div>বার্ষিক</div><div class="amt">৳${bnNum(P.yearly)}</div><div>${P.monthly * 12 > P.yearly ? `৳${bnNum(P.monthly * 12 - P.yearly)} সাশ্রয়` : 'প্রতি বছরে'}</div></div></div></section>
  <section><div class="eyebrow">নিজে চালিয়ে দেখুন</div><h2>ফ্রি ডেমো</h2>
    <div class="demo"><span>ঠিকানা: <code>${esc(s.demo[0])}.${esc(v.domain)}</code></span><span>মোবাইল: <code>${esc(s.demo[1])}</code></span><span>পাসওয়ার্ড: <code>Demo@123</code></span>
      <span style="color:var(--mu);font-size:.9rem">অ্যাপে শুধু <b>${esc(s.demo[0])}</b> লিখুন, অথবা ব্রাউজারে <a href="https://${esc(s.demo[0])}.${esc(v.domain)}">${esc(s.demo[0])}.${esc(v.domain)}</a> খুলুন।</span></div></section>
  <section><div class="eyebrow">কীভাবে শুরু করবেন</div><h2>৩ ধাপে শুরু</h2>
    <ol class="steps"><li><b>WhatsApp-এ মেসেজ দিন</b>দোকানের নাম, মালিকের নাম ও এলাকা লিখুন — আমরা আপনার দোকানের নিজস্ব ঠিকানা তৈরি করে দেব (যেমন yourshop.${esc(v.domain)})।</li>
      <li><b>অ্যাপ ডাউনলোড করুন</b>উপরের "অ্যাপ ডাউনলোড" চাপুন, ইনস্টল করে শুধু দোকানের নাম লিখুন।</li>
      <li><b>মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে লগইন</b>${isV ? `"নতুন ${s.key === 'car' ? 'গাড়ি' : 'বাইক'} যোগ" থেকে কাগজপত্রসহ এন্ট্রি দিন, বিক্রি করলে তারিখ ও লাভ নিজে হিসাব হবে।` : 'পণ্যের দাম ঠিক করে নিন, তারপর বিক্রি শুরু করুন।'}</li></ol></section>
  <div class="cta"><h2>আজই আপনার দোকানের হিসাব ডিজিটাল করুন</h2><p>${bnNum(P.trialDays)} দিন ফ্রি — WhatsApp-এ একটা মেসেজ দিন, বাকি সব আমরা করে দেব।</p>
    <div class="btns"><a class="btn wa" href="${v.waTrial}" target="_blank" rel="noopener">${v.WA}WhatsApp-এ মেসেজ দিন</a><a class="btn ghost" href="tel:+88${v.waLocal}">📞 কল করুন</a></div></div>
</main>
${allAppsHTML(s.key, v.prices)}
<footer>© ${esc(s.bn)} · ${esc(v.domain)} · ${esc(s.what.bn)} ব্যবসার হিসাব</footer>
<a class="float" href="${v.waQ}" target="_blank" rel="noopener" aria-label="WhatsApp-এ প্রশ্ন করুন">${v.WA}<span>প্রশ্ন করুন</span></a>
</body></html>`;
}

// rafid5.com home: every software, the shop finder and WhatsApp.
function hubPage(v) {
  const s = { color: '#1f2937', dark: '#0b1220', emoji: '📒' };
  return `${HEAD('ব্যবসার হিসাবের অ্যাপ — খাতা-কলম ছাড়ুন', 'কৃষিখাতা, নির্মাণখাতা, বাইকখাতা, ইটখাতা, মোবাইলখাতা, ফার্নিচারখাতা, গাড়িখাতা, হার্ডওয়্যারখাতা — আপনার ব্যবসার জন্য আলাদা অ্যাপ।', s.color, v.base, '/', '<link rel="icon" href="/icon.svg" type="image/svg+xml">')}
<style>${BASE_CSS(s)}
.hero .wrap{grid-template-columns:minmax(0,1fr)}.hero{padding:34px 0 46px}.apps a{padding:16px}.apps .em{width:58px;height:58px;font-size:2rem}.apps b{font-size:1.25rem}
.allapps{margin-top:30px}</style></head><body>
<header class="hero"><div class="wrap"><div>
  <span class="badge">📒 বাংলাদেশের দোকানের জন্য বানানো</span>
  <h1>খাতা-কলম ছাড়ুন, <em>ব্যবসার সব হিসাব মোবাইলে</em></h1>
  <p class="lead">বিক্রি, ক্যাশ মেমো, স্টক, বাকি, লাভ-ক্ষতি — আপনার ব্যবসার ধরন বেছে নিন। প্রতিটিতে ${bnNum(14)} দিন সম্পূর্ণ ফ্রি।</p>
  <div class="btns"><a class="btn wa" href="${v.waQ}" target="_blank" rel="noopener">${v.WA}WhatsApp: ${esc(v.waShow)}</a><a class="btn dl" href="#all">সব সফটওয়্যার দেখুন ↓</a></div>
</div></div></header>
${finderHTML(v.nf)}
${allAppsHTML('', v.prices)}
<footer>© ${esc(v.domain)} · ব্যবসার হিসাবের অ্যাপ</footer>
<a class="float" href="${v.waQ}" target="_blank" rel="noopener" aria-label="WhatsApp-এ প্রশ্ন করুন">${v.WA}<span>প্রশ্ন করুন</span></a>
</body></html>`;
}

module.exports = { SHARED_CSS, finderHTML, allAppsHTML, segPage, hubPage };
