'use strict';
/* Shop panels (owner/admin and sellers), login page, public product page, invoices. */

function calc(b) {
  const prod = (id) => b.products.find((p) => p.id == id);
  const sales = b.sales.reduce((s, x) => s + x.total, 0);
  const cogs = b.sales.reduce((s, x) => s + x.items.reduce((a, it) => a + (it.cost ?? 0) * it.qty, 0), 0);
  const exp = b.expenses.reduce((s, x) => s + x.amount, 0);
  const gross = sales - cogs, net = gross - exp;
  const recv = b.customers.reduce((s, c) => s + c.due, 0);
  const pay = b.vendors.reduce((s, v) => s + v.due, 0);
  const stockVal = b.products.reduce((s, p) => s + p.stock * (p.buy || 0), 0);
  const stockSell = b.products.reduce((s, p) => s + p.stock * p.sell, 0);
  const cashIn = b.sales.reduce((s, x) => s + x.paid, 0) + b.collections.reduce((s, x) => s + x.amount, 0);
  const cashOut = b.purchases.reduce((s, x) => s + x.paid, 0) + b.vpay.reduce((s, x) => s + x.amount, 0) + exp;
  const cash = b.opening + cashIn - cashOut;
  const todaySales = b.sales.filter((s) => s.date === todayStr()).reduce((a, s) => a + s.total, 0);
  const low = b.products.filter((p) => p.stock <= p.min);
  return { sales, cogs, exp, gross, net, recv, pay, stockVal, stockSell, cash, todaySales, low, prod };
}
const stockState = (p) => (p.stock <= 0 ? ['p-out', L('শেষ', 'Out')] : p.stock <= p.min ? ['p-low', L('কম', 'Low')] : ['p-ok', L('পর্যাপ্ত', 'OK')]);
const custOf = (b, s) => b.customers.find((c) => c.id === s.cust);
const custName = (b, s) => { const c = custOf(b, s); return c ? c.name : L('নগদ ক্রেতা', 'Walk-in customer'); };
const custPhone = (b, s) => { const c = custOf(b, s); return c ? c.phone : ''; };
const sellerLabel = (b, id) => (id === 'admin' ? L('অ্যাডমিন', 'Admin') : id + (b.sellers.find((x) => x.id === id) ? ' · ' + b.sellers.find((x) => x.id === id).name : ''));
const bizAct = async (btn, fn, msg) => act(btn, async () => { await fn(); await loadBiz(); render(); if (msg) toast(msg); });

/* ---------- Login ---------- */
VIEWS.login = () => `<div class="loginwrap">
  ${S.site?.missingShop ? `<div class="card" style="grid-column:1/-1;border-color:var(--berry)"><b style="color:var(--berry)">${L('এই ঠিকানায় কোনো দোকান নেই। ঠিকানা ঠিক আছে কিনা দেখুন।', 'There is no shop at this address. Check the address.')}</b></div>` : ''}
  <div class="card" style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;gap:10px;align-items:center"><div class="logo" style="width:46px;height:46px">${I(brand().icon || 'leaf')}</div><div><h2 style="font-size:1.5rem">${S.site?.admin ? L('মাদার প্যানেল', 'Mother panel') : S.site?.shop ? esc(S.site.shop.name) : L(`${N(brand().name)}-য় লগইন`, `Sign in to ${N(brand().name)}`)}</h2><span class="muted">${S.site?.admin ? L('শুধু সুপার অ্যাডমিনের জন্য', 'Super admin only') : S.site?.adminDomain ? L('দোকানের মালিক ও সেলাররা এখান থেকে ঢুকবেন', 'Shop owners and sellers sign in here') : L('মালিক, সেলার ও সুপার অ্যাডমিন — সবাই এখান থেকে ঢুকবেন', 'Owners, sellers and the super admin all sign in here')}</span></div></div>
    ${S.site?.shop?.demo && !S.site.shop.fresh ? `<a class="btn sun" href="/demo" style="justify-content:center;font-size:1.05rem;padding:13px">▶ ${L('লগইন ছাড়াই ডেমো দেখুন', 'Open the demo — no login needed')}</a>
    <p class="muted" style="margin:-4px 0 0;font-size:.85rem;text-align:center">${L('এটি ডেমো দোকান — যা খুশি চালিয়ে দেখুন। প্রতি রাতে নতুন করে সাজানো হয়।', 'This is a demo shop — try anything. It is refreshed every night.')}</p>` : ''}
    <form id="loginform" style="display:flex;flex-direction:column;gap:12px">
      <label class="f">${L('মোবাইল নম্বর (আইডি)', 'Mobile number (ID)')}<input class="in num" id="lg-phone" type="tel" inputmode="tel" autocomplete="username" placeholder="01XXXXXXXXX" required></label>
      <label class="f">${L('পাসওয়ার্ড', 'Password')}<span style="display:flex;gap:6px"><input class="in" id="lg-pass" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="current-password" required><button type="button" class="eyebtn" style="width:42px;height:42px" data-lgeye aria-label="${L('পাসওয়ার্ড দেখুন', 'Show password')}">${I('eye')}</button></span></label>
      ${S.site?.admin ? `<p class="muted" style="margin:0;font-size:.85rem">${I('shield')} ${L('নিরাপত্তার জন্য মাদার প্যানেলে প্রতিবার পাসওয়ার্ড লাগে। পেজ রিফ্রেশ করলে বা ৫ মিনিট কিছু না করলে লগআউট হবে।', 'For safety the mother panel always needs the password. Refreshing the page or 5 minutes without use signs you out.')}</p>` : `<label style="display:flex;gap:10px;align-items:center;font-weight:600;cursor:pointer"><input type="checkbox" id="lg-remember" style="width:20px;height:20px;accent-color:var(--leaf)" checked> ${window.KKAndroid ? L('মোবাইল নম্বর ও পাসওয়ার্ড মনে রাখুন (১ বছর)', 'Remember my number and password (1 year)') : L('মনে রাখুন (৩০ দিন লগইন থাকবে)', 'Remember me (stay signed in 30 days)')}</label>`}
      <button class="btn" type="submit" style="justify-content:center">${I('check')} ${L('লগইন', 'Sign in')}</button>
      ${window.KKAndroid && !S.site?.admin ? `<p class="muted" style="margin:0;font-size:.82rem">${L('অ্যাপ বন্ধ করলে নিজে থেকে লক হয়ে যায়; খুললে নম্বর ও পাসওয়ার্ড বসানো থাকবে, শুধু লগইন চাপুন। পাসওয়ার্ড শুধু এই ফোনে এনক্রিপ্ট করে রাখা হয় — অন্যের ফোনে টিক দেবেন না।', 'The app locks when you close it; when you open it, your number and password are filled in — just tap Sign in. The password is stored encrypted on this phone only — untick on someone else’s phone.')}</p>` : ''}
    </form>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-forgot>${L('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot password?')}</button>${window.KKAndroid ? `<button class="btn ghost sm" data-changeshop>${I('build')} ${L('অন্য দোকানের ঠিকানা', 'Another shop address')}</button>` : ''}</div>
  </div>
  <div class="card" style="display:flex;flex-direction:column;gap:10px">
    <h3>${BI()} ${N(brand().login)}</h3>
    <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
      <li>${L('বিক্রি, ক্যাশ মেমো ও বাকি এক জায়গায়', 'Sales, cash memos and dues in one place')}</li>
      <li>${L('স্টক নিজে থেকে কমে-বাড়ে, কম হলে সতর্কতা', 'Stock updates itself, with low-stock alerts')}</li>
      <li>${L('মাস শেষে লাভ-ক্ষতি ও ব্যালেন্স', 'Monthly profit, loss and balance')}</li>
      <li>${L('মালিক ও ৩ জন পর্যন্ত সেলারের আলাদা আইডি', 'Separate IDs for the owner and up to 3 sellers')}</li>
    </ul>
    ${window.KKAndroid ? '' : `<a class="btn sun" href="${brand().apk}" style="align-self:flex-start">${I('down')} ${L('Android অ্যাপ ডাউনলোড', 'Download the Android app')}</a><p class="muted" style="margin:0">${L('ফোনে ব্রাউজারের মেনু থেকে "হোম স্ক্রিনে যোগ করুন" দিলে অ্যাপের মতো আইকন হবে।', 'On a phone, use “Add to Home screen” in the browser menu to get an app icon.')}</p>`}
  </div></div>`;
// Saved sign-in: the Android app keeps number + password encrypted on the phone; browsers keep only the number.
function savedLogin() {
  try {
    if (window.KKAndroid && window.KKAndroid.getLogin) { const j = window.KKAndroid.getLogin(location.hostname); return j ? JSON.parse(j) : null; }
    const phone = localStorage.getItem('kk-phone:' + location.hostname); return phone ? { phone } : null;
  } catch (e) { return null; }
}
function rememberLogin(on, phone, pass) {
  try {
    if (window.KKAndroid && window.KKAndroid.saveLogin) { if (on) window.KKAndroid.saveLogin(location.hostname, phone, pass); else window.KKAndroid.clearLogin(location.hostname); return; }
    if (on) localStorage.setItem('kk-phone:' + location.hostname, phone); else localStorage.removeItem('kk-phone:' + location.hostname);
  } catch (e) {}
}
after.login = () => {
  if (S.site?.admin) { rememberLogin(false); return; }
  // Sent here from the wrong address: the mobile number is filled in (…/#id=01XXXXXXXXX).
  const m = location.hash.match(/^#id=(01\d{9})$/);
  if (m && $('#lg-phone')) { $('#lg-phone').value = fmtPhone(m[1]); history.replaceState(null, '', location.pathname); $('#lg-pass')?.focus(); return; }
  const s = savedLogin(); if (!s) return;
  if (s.phone && $('#lg-phone')) $('#lg-phone').value = fmtPhone(s.phone);
  if (s.pass && $('#lg-pass')) $('#lg-pass').value = s.pass;
};
async function doLogin(btn) {
  const phone = pk($('#lg-phone').value), password = $('#lg-pass').value, remember = !S.site?.admin && !!$('#lg-remember')?.checked;
  if (!validPhone(phone)) return toast(L('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন', 'Enter a valid 11-digit mobile number'), 'err');
  await act(btn, async () => {
    // In the app the session ends when the app closes, so ask the server for a normal (short) session there.
    const res = await api('POST', '/api/login', { phone, password, remember: remember && !window.KKAndroid });
    if (!res.ok) {
      // Right password, wrong address: show the owner's own shop address with a button.
      if (res.data.redirect) return wrongAddress(res.data);
      return toast(errText(res.data), 'err');
    }
    rememberLogin(remember, phone, password);
    S.me = res.data.me; S.otp = res.data.otp; await boot();
  });
}
function wrongAddress(d) {
  const url = d.redirect + '/#id=' + encodeURIComponent(d.phone || '');
  modal(`<h3>${I('globe')} ${L('ভুল ঠিকানা', 'Wrong address')}</h3><div style="opacity:.9">${esc(errText(d))}</div>`, `
    <p style="margin:0">${L('আপনার দোকানের ঠিকানা:', 'Your shop’s address:')}</p><div class="urlbox" style="font-size:1.05rem">${esc(d.redirect.replace(/^https?:\/\//, ''))}</div>
    <p class="muted" style="margin:0;font-size:.88rem">${L('এই ঠিকানাটি ব্রাউজারে সেভ (বুকমার্ক) করে রাখুন। অ্যাপে শুধু দোকানের নাম অংশটি লিখুন।', 'Save (bookmark) this address. In the app, type only the shop name part.')}</p>
    <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-close>${L('বন্ধ করুন', 'Close')}</button><a class="btn" href="${esc(url)}">${I('globe')} ${L('আমার দোকান খুলুন', 'Open my shop')}</a></div>`, { width: 480 });
}
function showForgot() {
  modal(`<h3>${I('shield')} ${L('পাসওয়ার্ড ভুলে গেছেন', 'Forgot password')}</h3><div style="opacity:.9">${L('আপনার মোবাইলে OTP যাবে', 'An OTP goes to your mobile')}</div>`, `
    <label class="f">${L('মোবাইল নম্বর (আইডি)', 'Mobile number (ID)')}<input class="in num" id="fg-phone" type="tel" value="${esc($('#lg-phone')?.value || '')}" placeholder="01XXXXXXXXX"></label>
    <label class="f">${L('নতুন পাসওয়ার্ড', 'New password')}<input class="in" id="fg-1" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="new-password"></label>
    <div data-rulesfor="fg-1">${rulesHTML('')}</div>
    <label class="f">${L('আবার লিখুন', 'Type it again')}<input class="in" id="fg-2" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="new-password"></label>
    <p class="muted" style="margin:0;font-size:.85rem">${L('OTP সিস্টেম বন্ধ থাকলে দোকানের মালিক বা সুপার অ্যাডমিন আপনার পাসওয়ার্ড বদলে দেবেন।', 'If OTP is switched off, ask the shop owner or super admin to reset your password.')}</p>
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" id="fg-save">${I('check')} ${L('OTP পাঠান', 'Send OTP')}</button></div>`, { width: 480 });
  $('#fg-save').onclick = async (e) => {
    const phone = pk($('#fg-phone').value), p1 = $('#fg-1').value;
    if (!validPhone(phone)) return toast(L('সঠিক মোবাইল নম্বর দিন', 'Enter a valid mobile number'), 'err');
    if (!passOk(p1)) return toast(passMsg(), 'err');
    if (p1 !== $('#fg-2').value) return toast(L('দুটি পাসওয়ার্ড মেলেনি', 'The two passwords don’t match'), 'err');
    await act(e.currentTarget, async () => { await call('POST', '/api/forgot', { phone, password: p1 }); closeModal(); toast(L('পাসওয়ার্ড বদলানো হয়েছে। এখন লগইন করুন।', 'Password changed. Sign in now.')); });
  };
}

/* ---------- Public product page ---------- */
VIEWS.public = () => {
  const s = S.pub;
  if (!s) return `<div class="card empty">${L('লোড হচ্ছে…', 'Loading…')}</div>`;
  if (s.missing) return `<div class="card empty">${L('দোকানটি পাওয়া যায়নি।', 'Shop not found.')}</div>`;
  return `<section class="shop-h">${heroScene()}<div style="position:relative;z-index:1"><span class="pill" style="background:rgba(255,255,255,.2);color:#fff">${BI()} ${esc(s.place)}</span>
    <h2 style="font-size:2rem;margin-top:8px">${esc(s.name)}</h2><p style="max-width:44ch;opacity:.92">${N(brand().hero)}</p>
    ${s.phone ? `<p style="margin:0;font-weight:700" class="num">${I('phone')} ${esc(dg(fmtPhone(s.phone)))}</p>` : ''}</div></section>
  ${s.cats.map((k) => { const list = s.products.filter((p) => p.cat === k && !(isVehicle(p) && !p.inStock)); return list.length ? `<h3 style="margin-top:6px">${catPill(k)}</h3><div class="grid g-kpi">${list.map((p) => `<div class="card prod"><div class="img" style="background:${CAT[p.cat].bg};color:${CAT[p.cat].color}">${I(CAT[p.cat].icon)}</div>
    <b>${esc(p.name)}</b>${pspec(p) ? `<span class="muted" style="font-size:.85rem">${esc(pspec(p))}</span>` : ''}<div style="display:flex;justify-content:space-between;align-items:center"><span class="num" style="font-family:var(--display);font-size:1.2rem;font-weight:800;color:var(--leaf-d)">${tk(p.sell)}</span><span class="muted">/ ${U(p.unit)}</span></div>
    <span class="pill ${p.inStock ? 'p-ok' : 'p-out'}" style="align-self:flex-start">${p.inStock ? L('স্টকে আছে', 'In stock') : L('স্টকে নেই', 'Out of stock')}</span></div>`).join('')}</div>` : ''; }).join('')}`;
};

/* ---------- Dashboard ---------- */
VIEWS.dash = () => {
  const b = S.cur, c = calc(b);
  const days = [6, 5, 4, 3, 2, 1, 0].map((d) => ({ d, date: dayOff(d), v: b.sales.filter((s) => s.date === dayOff(d)).reduce((a, s) => a + s.total, 0) }));
  const max = Math.max(...days.map((x) => x.v), 1);
  const byCat = b.cats.map((k) => ({ k, v: b.sales.reduce((a, s) => a + s.items.filter((it) => c.prod(it.pid)?.cat === k).reduce((x, it) => x + it.qty * it.price, 0), 0) }));
  const catMax = Math.max(...byCat.map((x) => x.v), 1);
  const st = subStateOf(b.sub), dl = daysTo(b.sub.expiry);
  const banner = st === 'soon' || b.sub.plan === 'trial' ? `<div class="card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-color:var(--sun);background:var(--sun-l)">${I('alert')}
    <div style="flex:1;min-width:200px"><b>${L(`আপনার ${N(PLAN_N[b.sub.plan])} প্ল্যান ${bn(dl)} দিন পর শেষ হবে (${fmtLong(b.sub.expiry)})`, `Your ${N(PLAN_N[b.sub.plan])} plan ends in ${bn(dl)} days (${fmtLong(b.sub.expiry)})`)}</b><div class="muted">${L('মেয়াদ শেষ হলে অ্যাকাউন্ট বন্ধ হয়ে যাবে। আগেই নবায়ন করুন।', 'The account locks when it expires. Renew before then.')}</div></div>
    <button class="btn sun sm" data-nav="billing">${I('crown')} ${L('নবায়ন করুন', 'Renew')}</button></div>` : '';
  return `${banner}
  <section class="hero">${heroScene()}
    <div style="position:relative;z-index:1">
      <h2>${L('আসসালামু আলাইকুম', 'Welcome')}, ${esc(b.owner)}</h2>
      <p>${new Date(todayStr() + 'T00:00:00Z').toLocaleDateString(LANG === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} — ${L('আপনার দোকানের সব হিসাব এক নজরে।', 'your whole shop at a glance.')}</p>
      <div class="row"><span class="chip num">${L('আজকের বিক্রি', 'Today’s sales')} ${tk(c.todaySales)}</span>${c.low.length ? `<button class="chip chip-warn" data-nav="stock">${I('alert')} ${L(`${bn(c.low.length)} পণ্যের স্টক কম`, `${bn(c.low.length)} low on stock`)}</button>` : `<span class="chip">✓ ${L('সব পণ্যের স্টক ঠিক আছে', 'Stock is fine')}</span>`}
      <button class="btn sm" data-nav="sale">${I('plus')} ${L('নতুন বিক্রি', 'New sale')}</button>${b.modules.includes('pur') ? `<button class="btn sm" data-nav="purchase">${I('truck')} ${L('মাল কিনুন', 'Buy stock')}</button>` : ''}</div>
    </div>
  </section>
  <div class="card"><div class="card-h"><h3>${I('search')} ${L('মোবাইল নম্বর দিয়ে খুঁজুন', 'Search by mobile number')}</h3><span class="muted" style="font-size:.85rem">${L('ক্রেতা, সেলার বা ভেন্ডর — ক্লিক করলে সব বিস্তারিত', 'Customers, sellers or vendors — click for details')}</span></div>
    <span class="searchbar" style="max-width:none">${I('phone')}<input id="d-q" type="search" inputmode="tel" value="${esc(S.dq)}" placeholder="${L('মোবাইল নম্বর বা নাম লিখুন', 'Type a mobile number or name')}" autocomplete="off"></span>
    <div class="reslist" id="d-res" style="margin-top:10px">${personResults()}</div></div>
  <div class="grid g-kpi">
    ${kpi('k-leaf', 'cart', L('মোট বিক্রি', 'Total sales'), tk(c.sales), L(`${bn(b.sales.length)} টি অর্ডার`, `${bn(b.sales.length)} orders`))}
    ${kpi('k-sun', 'trend', L('নিট লাভ', 'Net profit'), tk(c.net), L('মোট লাভ ', 'Gross ') + tk(c.gross) + L(' − খরচ', ' − expenses'))}
    ${kpi('k-sky', 'money', L('ক্যাশ ব্যালেন্স', 'Cash balance'), tk(c.cash), L('হাতে নগদ', 'Cash in hand'))}
    ${kpi('k-soil', 'box', L('স্টক মূল্য (ক্রয়)', 'Stock value (cost)'), tk(c.stockVal), L('বিক্রয় মূল্যে ', 'At sale price ') + tk(c.stockSell))}
    ${kpi('k-berry', 'hand', L('কাস্টমারের বাকি', 'Customer dues'), tk(c.recv), L('আপনি পাবেন', 'You will receive'))}
    ${kpi('k-berry', 'truck', L('ভেন্ডরের দেনা', 'Vendor dues'), tk(c.pay), L('আপনি দেবেন', 'You owe'))}
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>${I('trend')} ${L('গত ৭ দিনের বিক্রি', 'Sales, last 7 days')}</h3><span class="pill p-low">${L('আজ', 'Today')}</span></div>
      <div class="bars">${days.map((x) => `<div class="bar"><span class="v num">${x.v ? bn(Math.round(x.v / 1000)) + 'k' : ''}</span><div class="b ${x.d === 0 ? 'today' : ''}" style="height:${Math.max((x.v / max) * 85, 2)}%" title="${tk(x.v)}"></div></div>`).join('')}</div>
      <div class="bar-x">${days.map((x) => `<span>${fmtDate(x.date)}</span>`).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>${BI()} ${L('ক্যাটাগরি অনুযায়ী বিক্রি', 'Sales by category')}</h3></div>
      <div class="split">${byCat.map((x) => `<div class="row">${catPill(x.k)}<div class="track"><i style="width:${(x.v / catMax) * 100}%;background:${CAT[x.k].color}"></i></div><b class="num" style="text-align:right">${tk(x.v)}</b></div>`).join('')}</div>
      <div class="summary num" style="margin-top:16px">
        <div><span class="muted">${L('বিক্রি', 'Sales')}</span><span>${tk(c.sales)}</span></div>
        <div><span class="muted">− ${L('পণ্যের ক্রয় মূল্য', 'Cost of goods')}</span><span>${tk(c.cogs)}</span></div>
        <div><span class="muted">− ${L('খরচ', 'Expenses')}</span><span>${tk(c.exp)}</span></div>
        <div><b>= ${L('নিট লাভ', 'Net profit')}</b><b style="color:var(--leaf-d)">${tk(c.net)}</b></div></div></div>
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>${I('alert')} ${L('স্টক সতর্কতা', 'Stock alerts')}</h3><button class="btn ghost sm" data-nav="stock">${L('সব স্টক', 'All stock')}</button></div>
      ${c.low.length ? `<div class="tablewrap"><table><thead><tr><th>${L('পণ্য', 'Product')}</th><th class="r">${L('স্টক', 'Stock')}</th><th class="r">${L('ন্যূনতম', 'Min')}</th><th>${L('অবস্থা', 'Status')}</th></tr></thead><tbody>
      ${c.low.map((p) => { const [cl, t] = stockState(p); return `<tr><td>${esc(p.name)}</td><td class="r num">${bn(p.stock)} ${U(p.unit)}</td><td class="r num muted">${bn(p.min)}</td><td><span class="pill ${cl}">${t}</span></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">${L('সব পণ্যের স্টক পর্যাপ্ত আছে।', 'All products are well stocked.')}</div>`}</div>
    <div class="card"><div class="card-h"><h3>${I('receipt')} ${L('সাম্প্রতিক বিক্রি', 'Recent sales')}</h3><button class="btn ghost sm" data-nav="orders">${L('সব অর্ডার', 'All orders')}</button></div>
      ${salesTable(b.sales.slice(-6).reverse(), true)}</div>
  </div>`;
};
function salesTable(list, compact, canVoid) {
  const b = S.cur;
  if (!list.length) return `<div class="empty">${L('এখনো কোনো বিক্রি নেই।', 'No sales yet.')}</div>`;
  return `<div class="tablewrap"><table><thead><tr><th>${L('মেমো', 'Memo')}</th><th>${L('তারিখ', 'Date')}</th><th>${L('ক্রেতা', 'Customer')}</th><th>${L('মোবাইল', 'Mobile')}</th>${compact ? '' : `<th>${L('সেলার', 'Seller')}</th>`}<th class="r">${L('মোট', 'Total')}</th><th class="r">${L('বাকি', 'Due')}</th><th></th></tr></thead><tbody>
  ${list.map((s) => { const ph = custPhone(b, s); return `<tr><td class="num"><b>#${dg(s.id)}</b></td><td class="num" style="white-space:nowrap">${fmtDate(s.date)}</td><td>${esc(custName(b, s))}</td><td class="num muted" style="white-space:nowrap">${ph ? esc(dg(fmtPhone(ph))) : '—'}</td>${compact ? '' : `<td><span class="pill p-ok">${esc(s.seller === 'admin' ? L('অ্যাডমিন', 'Admin') : s.seller)}</span></td>`}<td class="r num">${tk(s.total)}</td><td class="r num">${s.total - s.paid > 0 ? `<span class="pill p-due">${tk(s.total - s.paid)}</span>` : `<span class="pill p-ok">${L('পরিশোধ', 'Paid')}</span>`}</td>
  <td class="r" style="white-space:nowrap"><button class="btn ghost sm" data-inv="${s.id}">${I('file')} ${L('ইনভয়েস', 'Invoice')}</button>${canVoid ? ` <button class="btn ghost sm" data-voidsale="${s.sid}" aria-label="${L('বাতিল', 'Cancel')}">${I('trash')}</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function personResults() {
  const q = (S.dq || '').trim(); if (!q) return `<div class="muted" style="font-size:.88rem">${L('কমপক্ষে ৩টি সংখ্যা বা নামের অংশ লিখুন।', 'Type at least 3 digits or part of a name.')}</div>`;
  const b = S.cur, qd = pk(q), ql = q.toLowerCase();
  const hit = (ph, name) => (qd.length >= 3 && pk(ph).includes(qd)) || String(name).toLowerCase().includes(ql);
  const items = [
    ...b.customers.filter((c) => hit(c.phone, c.name)).map((c) => ({ k: 'c', id: c.id, name: c.name, ph: c.phone, tag: `<span class="pill p-ok">${L('ক্রেতা', 'Customer')}</span>`, extra: c.due ? `<span class="pill p-due">${L('বাকি', 'Due')} ${tk(c.due)}</span>` : '' })),
    ...b.sellers.filter((s) => hit(s.phone, s.name)).map((s) => ({ k: 's', id: s.id, name: s.name, ph: s.phone, tag: `<span class="pill p-low">${L('সেলার', 'Seller')} ${s.id}</span>`, extra: '' })),
    ...b.vendors.filter((v) => hit(v.phone, v.name)).map((v) => ({ k: 'v', id: v.id, name: v.name, ph: v.phone, tag: `<span class="pill p-fert">${L('ভেন্ডর', 'Vendor')}</span>`, extra: v.due ? `<span class="pill p-due">${L('দেনা', 'Owed')} ${tk(v.due)}</span>` : '' })),
  ];
  if (!items.length) return `<div class="empty" style="padding:10px">${L('এই নম্বরে কাউকে পাওয়া যায়নি।', 'Nobody found with that number.')}</div>`;
  return items.slice(0, 8).map((x) => `<button type="button" class="resrow" data-person="${x.k}:${x.id}"><span class="who"><span class="av2">${I(x.k === 'v' ? 'truck' : 'user')}</span><span><b>${esc(x.name)}</b> ${x.tag}<br><span class="muted num" style="font-size:.85rem">${esc(dg(fmtPhone(x.ph)))}</span></span></span><span style="display:flex;gap:6px;align-items:center">${x.extra}<span class="btn ghost sm">${L('বিস্তারিত', 'Details')} →</span></span></button>`).join('');
}
function showPerson(k, id) {
  const b = S.cur; let head = '', body = '';
  const memoTable = (list) => (list.length ? `<div class="tablewrap"><table><thead><tr><th>${L('মেমো', 'Memo')}</th><th>${L('তারিখ', 'Date')}</th><th class="r">${L('মোট', 'Total')}</th><th class="r">${L('বাকি', 'Due')}</th><th></th></tr></thead><tbody>${list.slice().reverse().map((s) => `<tr><td class="num"><b>#${dg(s.id)}</b></td><td class="num" style="white-space:nowrap">${fmtDate(s.date)}</td><td class="r num">${tk(s.total)}</td><td class="r num">${s.total - s.paid > 0 ? `<span class="pill p-due">${tk(s.total - s.paid)}</span>` : `<span class="pill p-ok">${L('পরিশোধ', 'Paid')}</span>`}</td><td class="r"><button class="btn ghost sm" data-inv="${s.id}" aria-label="${L('ইনভয়েস', 'Invoice')}">${I('file')}</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${L('কোনো মেমো নেই।', 'No memos.')}</div>`);
  if (k === 'c') {
    const c = b.customers.find((x) => x.id == id); if (!c) return;
    const ss = b.sales.filter((s) => s.cust === c.id), tot = ss.reduce((a, s) => a + s.total, 0), paid = ss.reduce((a, s) => a + s.paid, 0) + b.collections.filter((x) => x.cust === c.id).reduce((a, x) => a + x.amount, 0);
    const items = {}; ss.forEach((s) => s.items.forEach((it) => { items[it.pid] = (items[it.pid] || 0) + it.qty; }));
    head = `<h3>${I('user')} ${esc(c.name)}</h3><div style="opacity:.9" class="num">${esc(dg(fmtPhone(c.phone)))} · ${esc(c.village)}</div>`;
    body = `<div class="summary num"><div><span class="muted">${L('মোট কেনা', 'Total bought')}</span><b>${tk(tot)}</b></div><div><span class="muted">${L('মোট জমা', 'Total paid')}</span><b>${tk(paid)}</b></div><div><span class="muted">${L('এখন বাকি', 'Due now')}</span><span class="due">${tk(c.due)}</span></div><div><span class="muted">${L('মেমো সংখ্যা', 'Memos')}</span><b>${bn(ss.length)}</b></div></div>
      ${c.due && role() === 'admin' ? `<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap"><label class="f" style="flex:1;min-width:150px">${L('বাকি জমা নিন (৳)', 'Collect due (৳)')}<input class="in num" id="mcol" type="text" inputmode="decimal" data-amt placeholder="${bn(c.due)}"></label><button class="btn" data-mcollect="${c.id}">${I('check')} ${L('জমা', 'Collect')}</button></div>` : ''}
      ${Object.keys(items).length ? `<div><b>${L('যা যা কিনেছেন', 'Products bought')}</b><div class="chips" style="margin-top:6px">${Object.entries(items).map(([pid, q]) => { const p = b.products.find((x) => x.id == pid); return `<span class="pill ${CAT[p?.cat]?.cls || 'p-ok'}">${esc(p?.name || '—')} × ${bn(q)}</span>`; }).join('')}</div></div>` : ''}
      ${memoTable(ss)}`;
  }
  if (k === 's') {
    const s = b.sellers.find((x) => x.id === id); if (!s) return;
    const ss = b.sales.filter((x) => x.seller === s.id), td = ss.filter((x) => x.date === todayStr()), ms = ss.filter((x) => x.date.slice(0, 7) === todayStr().slice(0, 7));
    head = `<h3>${I('user')} ${esc(s.name)} · ${s.id}</h3><div style="opacity:.9" class="num">${esc(dg(fmtPhone(s.phone)))}</div>`;
    body = `<div class="summary num"><div><span class="muted">${L('আজকের বিক্রি', 'Today')}</span><b>${tk(td.reduce((a, x) => a + x.total, 0))}</b></div><div><span class="muted">${L('এই মাসের বিক্রি', 'This month')}</span><b>${tk(ms.reduce((a, x) => a + x.total, 0))}</b></div><div><span class="muted">${L('মোট বিক্রি', 'All time')}</span><b>${tk(ss.reduce((a, x) => a + x.total, 0))}</b></div><div><span class="muted">${L('তার মেমোতে বাকি', 'Due on their memos')}</span><span class="due">${tk(ss.reduce((a, x) => a + x.total - x.paid, 0))}</span></div></div>${memoTable(ss)}`;
  }
  if (k === 'v') {
    const v = b.vendors.find((x) => x.id == id); if (!v) return;
    const ps = b.purchases.filter((p) => p.vendor === v.id);
    head = `<h3>${I('truck')} ${esc(v.name)}</h3><div style="opacity:.9" class="num">${esc(dg(fmtPhone(v.phone)))}</div>`;
    body = `<div class="summary num"><div><span class="muted">${L('মোট কেনা', 'Total purchased')}</span><b>${tk(ps.reduce((a, p) => a + p.total, 0))}</b></div><div><span class="muted">${L('আপনার দেনা', 'You owe')}</span><span class="due">${tk(v.due)}</span></div></div>
      ${ps.length ? `<div class="tablewrap"><table><thead><tr><th>${L('তারিখ', 'Date')}</th><th>${L('পণ্য', 'Product')}</th><th class="r">${L('মোট', 'Total')}</th><th class="r">${L('পরিশোধ', 'Paid')}</th></tr></thead><tbody>${ps.slice().reverse().map((p) => { const pr = b.products.find((x) => x.id === p.items[0].pid); return `<tr><td class="num">${fmtDate(p.date)}</td><td>${esc(pr?.name || '—')} × ${bn(p.items[0].qty)}</td><td class="r num">${tk(p.total)}</td><td class="r num">${tk(p.paid)}</td></tr>`; }).join('')}</tbody></table></div>` : ''}
      <button class="btn ghost sm" data-nav="dues" style="align-self:flex-start">${L('বাকি হিসাবে যান', 'Go to dues')}</button>`;
  }
  modal(head, body + `<div style="text-align:right"><button class="btn" data-close>${L('বন্ধ করুন', 'Close')}</button></div>`, { label: L('বিস্তারিত', 'Details') });
}

/* ---------- New sale ---------- */
let draft = null;
const newDraft = () => ({ cust: '0', newName: '', newVillage: '', newPhone: '', lines: [], paid: '', pq: '', pcat: 'all', cq: '' });
VIEWS.sale = () => {
  const b = S.cur; if (!draft) draft = newDraft();
  const isSeller = role() === 'seller';
  const mine = b.sales.filter((s) => (isSeller ? true : s.seller === 'admin') && s.date === todayStr());
  return `
  <div class="pagehead"><div><h2>${L('নতুন বিক্রি / অর্ডার', 'New sale / order')}</h2><p>${isSeller ? L(`সেলার <b>${esc(S.me.sellerCode)} · ${esc(S.me.name)}</b> — আপনি শুধু বিক্রির তথ্য এন্ট্রি দিতে পারবেন।`, `Seller <b>${esc(S.me.sellerCode)} · ${esc(S.me.name)}</b> — you can only enter sales.`) : L('পণ্য বাছাই করুন, টাকার হিসাব নিজে থেকেই হবে। স্টক ও বাকি অটো আপডেট হবে।', 'Pick products and the totals work themselves out. Stock and dues update automatically.')}</p></div>
  ${isSeller ? `<div class="kpi k-leaf" style="padding:10px 16px"><div class="lbl">${L('আজ আমার বিক্রি', 'My sales today')}</div><div class="val num" style="font-size:1.3rem">${tk(mine.reduce((a, s) => a + s.total, 0))}</div></div>` : ''}</div>
  <div class="grid salegrid">
    <div class="card">
      <div class="custfind">
        <label class="f">${L('ক্রেতার মোবাইল নম্বর দিয়ে খুঁজুন', 'Find the customer by mobile number')}<span class="searchbar" style="max-width:none">${I('phone')}<input id="s-cq" type="search" inputmode="tel" value="${esc(draft.cq)}" placeholder="${L('যেমন: ০১৮১৯ বা 01819', 'e.g. 01819')}" autocomplete="off"></span></label>
        <div class="reslist" id="cq-res">${custResults()}</div>
      </div>
      <div class="form-g" style="margin-bottom:14px">
        <label class="f">${L('ক্রেতা', 'Customer')}<select class="in" id="s-cust">
          <option value="0">${L('নগদ ক্রেতা (Walk-in)', 'Walk-in customer (cash)')}</option>
          ${b.customers.map((c) => `<option value="${c.id}" ${draft.cust == c.id ? 'selected' : ''}>${esc(c.name)} — ${esc(c.village)} · ${esc(dg(fmtPhone(c.phone)))}${c.due ? ` (${L('বাকি', 'due')} ${tk(c.due)})` : ''}</option>`).join('')}
          <option value="new" ${draft.cust === 'new' ? 'selected' : ''}>+ ${L('নতুন ক্রেতা', 'New customer')}</option></select></label>
      </div>
      <div class="newcust" id="newcustwrap" ${draft.cust === 'new' ? '' : 'hidden'}>
        <label class="f">${L('নতুন ক্রেতার নাম', 'Customer name')}<input class="in" id="s-newname" maxlength="60" value="${esc(draft.newName)}"></label>
        <label class="f">${L('গ্রাম', 'Village')}<input class="in" id="s-newvillage" maxlength="60" value="${esc(draft.newVillage)}"></label>
        <label class="f">${L('মোবাইল নম্বর', 'Mobile number')}<input class="in num" id="s-newphone" type="tel" inputmode="tel" maxlength="14" value="${esc(draft.newPhone)}" placeholder="01XXXXXXXXX"></label>
      </div>
      <div class="picker">
        <b style="display:flex;gap:6px;align-items:center">${I('search')} ${L('পণ্য খুঁজুন — নাম, আইডি বা বক্স নম্বর', 'Find a product — name, ID or box number')}</b>
        <span class="searchbar" style="max-width:none">${I('search')}<input id="s-pq" type="search" value="${esc(draft.pq)}" placeholder="${N(brand().search)}" autocomplete="off"></span>
        <div class="chips" role="group" aria-label="${L('ক্যাটাগরি', 'Category')}">${[['all', null], ...b.cats.map((k) => [k, CAT[k]])].map(([k, c]) => `<button type="button" class="chip-btn ${draft.pcat === k ? 'on' : ''}" data-pcat="${k}" aria-pressed="${draft.pcat === k}">${c ? I(c.icon) + CN(k) : L('সব', 'All')}</button>`).join('')}</div>
        <div class="pgrid" id="p-res">${prodResults()}</div>
      </div>
      <h3 style="font-size:1rem;margin-bottom:8px">${I('cart')} ${L('এই মেমোর পণ্য', 'Items on this memo')}</h3>
      <div class="lines" id="lines">${linesHTML()}</div>
    </div>
    <div class="card" id="billcard" style="display:flex;flex-direction:column;gap:12px;align-self:start">
      <h3>${I('receipt')} ${L('হিসাব', 'Bill')}</h3>
      <div class="summary num" id="sumbox"></div>
      <label class="f">${L('ক্রেতা কত টাকা দিলেন (৳)', 'Amount paid now (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="s-paid" value="${esc(draft.paid)}" placeholder="${L('পুরো টাকা হলে খালি রাখুন', 'Leave empty if fully paid')}"></label>
      <button class="btn sun" data-savesale style="justify-content:center">${I('check')} ${L('বিক্রি সেভ ও ইনভয়েস তৈরি', 'Save sale & make invoice')}</button>
      <span class="demo-note">${I('alert')} ${L('নগদ ক্রেতার ক্ষেত্রে বাকি রাখা যাবে না।', 'Walk-in customers must pay in full.')}</span>
    </div>
  </div>
  <div class="cartbar" id="cartbar" hidden></div>`;
};
after.sale = () => updSum();
function prodResults() {
  const b = S.cur, q = toAscii((draft?.pq || '').trim()).toLowerCase(), cat = draft?.pcat || 'all';
  const list = b.products.filter((p) => (cat === 'all' || p.cat === cat) && (!q || (/^#?\d+$/.test(q) && String(p.id) === q.replace('#', '')) || [p.name, p.box, p.brand, p.size].filter(Boolean).some((x) => toAscii(String(x)).toLowerCase().includes(q))));
  list.sort((a, z) => (String(z.id) === q.replace('#', '')) - (String(a.id) === q.replace('#', '')));
  if (!S.cur.products.length) return `<div style="grid-column:1/-1">${`<div class="card empty" style="text-align:center;padding:22px">${I('tag')} <b>${L('এখনো কোনো পণ্য নেই', 'No products yet')}</b><br><span class="muted">${L('পণ্য তালিকা থেকে প্রথম পণ্য যোগ করুন — তারপর এখানে দেখা যাবে।', 'Add your first product in the product catalog — it will show here.')}</span><br>${role() === 'admin' ? `<button class="btn sm" style="margin-top:10px" data-nav="catalog">${I('plus')} ${L('প্রথম পণ্য যোগ করুন', 'Add the first product')}</button>` : ''}</div>`}</div>`;
  if (!list.length) return `<div class="empty" style="grid-column:1/-1;padding:10px">${L('কোনো পণ্য পাওয়া যায়নি।', 'No products found.')}</div>`;
  return list.slice(0, 12).map((p) => { const inCart = draft.lines.find((l) => l.pid == p.id);
    return `<button type="button" class="pitem" data-addp="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
      <span class="meta"><span class="num">${L('আইডি', 'ID')} #${dg(p.id)}</span>${hasBox(b) && p.box ? `<span class="num">${esc(dg(p.box))}</span>` : ''}</span>
      <b>${esc(p.name)}</b>${pspec(p) ? `<span class="meta"><span>${esc(pspec(p))}</span></span>` : ''}
      <span class="meta"><span class="price num">${tk(p.sell)}/${U(p.unit)}</span><span class="num">${p.stock <= 0 ? L('স্টক শেষ', 'Out of stock') : L('স্টক ', 'Stock ') + bn(p.stock)}</span></span>
      <span class="meta"><span class="pill ${CAT[p.cat]?.cls || 'p-ok'}" style="font-size:.72rem">${CN(p.cat)}</span><span style="color:var(--leaf-d);font-weight:700">${inCart ? L(`✓ ${bn(inCart.qty)} টি`, `✓ ${bn(inCart.qty)} added`) : '+ ' + L('যোগ করুন', 'Add')}</span></span>
    </button>`; }).join('');
}
function lineHTML(l, i) {
  const p = S.cur.products.find((x) => x.id == l.pid);
  if (isVehicle(p)) return vehicleLineHTML(l, i, p);
  return `<div class="line" data-line="${i}">
    <div style="min-width:0"><b style="display:block;overflow-wrap:anywhere">${esc(p?.name || '—')}</b><span class="muted num" style="font-size:.8rem">${p && pspec(p) ? esc(pspec(p)) + ' · ' : ''}${L('স্টক', 'Stock')} ${bn(p?.stock)} ${U(p?.unit)}</span>
      ${pcsConv(p) ? `<span class="pcsbox"><input class="in num" type="text" inputmode="decimal" data-amt data-lpcs="${i}" value="${l.pcs ?? ''}" placeholder="0" aria-label="${L('কত পিস', 'How many pieces')}"> ${L('পিস', 'pcs')} → <b class="num" data-lpq="${i}">${l.pcs ? bn(l.qty) + ' ' + U(p.unit) : L('পিস লিখলে হিসাব হবে', 'type pieces to convert')}</b></span>` : ''}</div>
    <input class="in num" type="text" inputmode="decimal" data-amt data-lq="${i}" value="${l.qty}" aria-label="${L('পরিমাণ', 'Quantity')}">
    <input class="in num" type="text" inputmode="decimal" data-amt data-lr="${i}" value="${l.price}" aria-label="${L('দর', 'Rate')}" ${role() === 'seller' ? `readonly title="${L('দর অ্যাডমিন নির্ধারণ করেন', 'Prices are set by the admin')}"` : ''}>
    <span class="tot num" data-lt="${i}">${tk(l.qty * l.price)}</span>
    <button class="iconbtn" data-dline="${i}" aria-label="${L('সারি মুছুন', 'Remove row')}">${I('x')}</button></div>`;
}
// A vehicle on the memo: always one, with its papers shown.
const vehicleLineHTML = (l, i, p) => `<div class="line" data-line="${i}">
    <div style="min-width:0"><b style="display:block;overflow-wrap:anywhere">${esc(p.name)}</b><span class="muted num" style="font-size:.8rem">${esc(vspec(p))}</span></div>
    <input class="in num" type="text" value="1" readonly aria-label="${L('পরিমাণ', 'Quantity')}" data-lq="${i}">
    <input class="in num" type="text" inputmode="decimal" data-amt data-lr="${i}" value="${l.price}" aria-label="${L('দর', 'Rate')}" ${role() === 'seller' ? 'readonly' : ''}>
    <span class="tot num" data-lt="${i}">${tk(l.qty * l.price)}</span>
    <button class="iconbtn" data-dline="${i}" aria-label="${L('সারি মুছুন', 'Remove row')}">${I('x')}</button></div>`;
const linesHead = () => `<div class="line line-h"><span>${L('পণ্য', 'Product')}</span><span>${L('পরিমাণ', 'Qty')}</span><span>${L('দর (৳)', 'Rate (৳)')}</span><span style="text-align:right">${L('টাকা', 'Amount')}</span><span></span></div>`;
const linesHTML = () => (draft.lines.length ? linesHead() + draft.lines.map(lineHTML).join('') : `<div class="empty" style="padding:12px;border:1.5px dashed var(--line);border-radius:12px">${L('উপরে থেকে পণ্যে ক্লিক করে যোগ করুন।', 'Click a product above to add it.')}</div>`);
function addProduct(pid) {
  const p = S.cur.products.find((x) => x.id == pid); if (!p || p.stock <= 0) return;
  const l = draft.lines.find((x) => x.pid == pid);
  if (l) { if (l.qty + 1 > p.stock) return toast(L('স্টকে আর নেই', 'No more in stock'), 'err'); l.qty++; }
  else draft.lines.push({ pid: p.id, qty: 1, price: p.sell, pcs: null });
  $('#lines').innerHTML = linesHTML(); $('#p-res').innerHTML = prodResults(); updSum();
}
function custResults() {
  const q = (draft?.cq || '').trim(); if (!q) return '';
  const qd = pk(q), ql = q.toLowerCase();
  const list = S.cur.customers.filter((c) => (qd.length >= 3 && pk(c.phone).includes(qd)) || c.name.toLowerCase().includes(ql));
  const rows = list.slice(0, 5).map((c) => `<button type="button" class="resrow" data-pickcust="${c.id}"><span class="who"><span class="av2">${I('user')}</span><span><b>${esc(c.name)}</b><br><span class="muted num" style="font-size:.85rem">${esc(dg(fmtPhone(c.phone)))} · ${esc(c.village)}</span></span></span>${c.due ? `<span class="pill p-due">${L('বাকি', 'Due')} ${tk(c.due)}</span>` : `<span class="pill p-ok">${L('বাকি নেই', 'No due')}</span>`}</button>`).join('');
  const add = validPhone(q) && !list.some((c) => pk(c.phone) === qd) ? `<button type="button" class="resrow" data-newcustph><span class="who"><span class="av2">${I('plus')}</span><span><b>${L('এই নম্বরে কেউ নেই — নতুন ক্রেতা যোগ করুন', 'No one with this number — add a new customer')}</b><br><span class="muted num">${esc(dg(fmtPhone(q)))}</span></span></span></button>` : '';
  return rows + add || `<div class="muted" style="font-size:.88rem">${L('মিলছে না। পুরো ১১ সংখ্যার নম্বর দিলে নতুন ক্রেতা যোগ করতে পারবেন।', 'No match. Type the full 11-digit number to add a new customer.')}</div>`;
}
function updSum() {
  const box = $('#sumbox'); if (!box) return;
  const total = draft.lines.reduce((a, l) => a + l.qty * l.price, 0);
  const paid = draft.paid === '' ? total : toNum(draft.paid);
  draft.lines.forEach((l, i) => { const e = document.querySelector(`[data-lt="${i}"]`); if (e) e.textContent = tk(l.qty * l.price); });
  box.innerHTML = `<div><span class="muted">${L('পণ্য সংখ্যা', 'Items')}</span><span>${bn(draft.lines.length)}</span></div>
    <div><span class="muted">${L('মোট', 'Total')}</span><span class="grand">${tk(total)}</span></div>
    <div><span class="muted">${L('জমা', 'Paid')}</span><span>${tk(Math.min(paid, total))}</span></div>
    <div><span class="muted">${L('বাকি', 'Due')}</span><span class="due">${tk(Math.max(total - paid, 0))}</span></div>`;
  // Phone: a bar at the bottom shows the memo so far, with a button to jump to the bill.
  const bar = $('#cartbar');
  if (bar) {
    bar.hidden = !draft.lines.length;
    bar.innerHTML = `<span>${I('cart')} <b>${bn(draft.lines.length)}</b> ${L('টি পণ্য', 'items')} · <b class="num">${tk(total)}</b></span><button class="btn sun sm" data-gobill>${L('হিসাব ও সেভ', 'Bill & save')} ↓</button>`;
  }
}
async function saveSale(btn) {
  if (!draft.lines.length) return toast(L('অন্তত একটি পণ্য যোগ করুন', 'Add at least one product'), 'err');
  if (draft.cust === 'new' && (!draft.newName.trim() || !validPhone(draft.newPhone))) return toast(L('নতুন ক্রেতার নাম ও সঠিক মোবাইল নম্বর দিন', 'Enter the new customer’s name and a valid mobile number'), 'err');
  await act(btn, async () => {
    const r = await call('POST', bizUrl('/sales'), { cust: draft.cust, newCustomer: { name: draft.newName, village: draft.newVillage, phone: pk(draft.newPhone) }, items: draft.lines.map((l) => ({ pid: l.pid, qty: l.qty, price: l.price, pcs: l.pcs || null })), paid: draft.paid === '' ? '' : toNum(draft.paid) });
    draft = null; await loadBiz(); render(); showInvoice(r.memo); toast(L('বিক্রি সেভ হয়েছে · স্টক আপডেট হয়েছে', 'Sale saved · stock updated'));
  });
}

VIEWS.mysales = () => {
  const b = S.cur, mine = b.sales.slice().reverse();
  const tot = mine.reduce((a, s) => a + s.total, 0), td = mine.filter((s) => s.date === todayStr()).reduce((a, s) => a + s.total, 0);
  return `<div class="pagehead"><div><h2>${L('আমার বিক্রি', 'My sales')}</h2><p>${L('শুধু আপনার এন্ট্রি দেখা যাবে।', 'Only your own entries are shown.')}</p></div></div>
  <div class="grid g-kpi">${kpi('k-sun', 'cart', L('আজকের বিক্রি', 'Today’s sales'), tk(td))}${kpi('k-leaf', 'receipt', L('মোট বিক্রি', 'Total sales'), tk(tot), L(`${bn(mine.length)} টি মেমো`, `${bn(mine.length)} memos`))}${kpi('k-berry', 'hand', L('আমার এন্ট্রিতে বাকি', 'Dues on my sales'), tk(mine.reduce((a, s) => a + s.total - s.paid, 0)))}</div>
  <div class="card">${salesTable(mine, true)}</div>`;
};
VIEWS.account = () => `<div class="pagehead"><div><h2>${L('আমার অ্যাকাউন্ট', 'My account')}</h2></div></div>
  <div class="card" style="max-width:520px"><div class="summary num">
    <div><span class="muted">${L('নাম', 'Name')}</span><b>${esc(S.me.name)}</b></div>
    <div><span class="muted">${L('আইডি (মোবাইল)', 'ID (mobile)')}</span><b>${esc(dg(fmtPhone(S.me.phone)))}</b></div>
    <div><span class="muted">${L('ব্যবসা', 'Business')}</span><b>${esc(S.cur.name)}</b></div>
    <div><span class="muted">${L('সেলার কোড', 'Seller code')}</span><b>${esc(S.me.sellerCode || '')}</b></div></div>
    <button class="btn" style="margin-top:12px" data-ownpass>${I('shield')} ${L('পাসওয়ার্ড বদলান', 'Change password')}</button></div>`;

/* ---------- Stock ---------- */
function stockMatch(p) { const q = toAscii((S.sq || '').trim()).toLowerCase(); return !q || [p.name, p.box, p.brand, p.size, '#' + p.id].filter(Boolean).some((x) => toAscii(String(x)).toLowerCase().includes(q)); }
VIEWS.stock = () => {
  const b = S.cur, c = calc(b), box = hasBox(b);
  return `<div class="pagehead"><div><h2>${L('স্টক ও ইনভেন্টরি', 'Stock & inventory')}</h2><p>${L('প্রতিটি বিক্রি ও ক্রয়ে স্টক নিজে থেকে কমে-বাড়ে।', 'Stock goes down with every sale and up with every purchase.')}</p></div>${b.modules.includes('pur') ? `<button class="btn" data-nav="purchase">${I('truck')} ${L('স্টক যোগ (ক্রয়)', 'Add stock (purchase)')}</button>` : ''}</div>
  <div class="grid g-kpi">${kpi('k-soil', 'box', L('মোট স্টক মূল্য', 'Stock value'), tk(c.stockVal), L('ক্রয় দরে', 'At cost'))}${kpi('k-leaf', 'tag', L('বিক্রয় দরে মূল্য', 'At sale price'), tk(c.stockSell), L('সম্ভাব্য লাভ ', 'Potential profit ') + tk(c.stockSell - c.stockVal))}${kpi('k-sun', 'alert', L('কম স্টক', 'Low stock'), bn(c.low.filter((p) => p.stock > 0).length))}${kpi('k-berry', 'x', L('স্টক শেষ', 'Out of stock'), bn(b.products.filter((p) => p.stock <= 0).length))}</div>
  ${searchBar('sq', S.sq, box ? L('পণ্যের নাম, আইডি বা বক্স নম্বর দিয়ে খুঁজুন', 'Search by product name, ID or box number') : L('পণ্যের নাম দিয়ে খুঁজুন', 'Search by product name'))}
  ${!b.products.length ? `<div class="card empty" style="text-align:center;padding:22px">${I('tag')} <b>${L('এখনো কোনো পণ্য নেই', 'No products yet')}</b><br><span class="muted">${L('পণ্য তালিকা থেকে প্রথম পণ্য যোগ করুন — তারপর এখানে দেখা যাবে।', 'Add your first product in the product catalog — it will show here.')}</span><br>${role() === 'admin' ? `<button class="btn sm" style="margin-top:10px" data-nav="catalog">${I('plus')} ${L('প্রথম পণ্য যোগ করুন', 'Add the first product')}</button>` : ''}</div>` : ''}
  ${(b.products.length ? b.cats : []).map((k) => `<div class="card"><div class="card-h"><h3>${catPill(k)}</h3></div>
  <div class="tablewrap"><table><thead><tr><th>#</th><th>${L('পণ্য', 'Product')}</th>${box ? `<th>${L('বক্স নং', 'Box no.')}</th>` : ''}<th class="r">${L('স্টক', 'Stock')}</th><th class="r">${L('ক্রয় দর', 'Cost')}</th><th class="r">${L('বিক্রয় দর', 'Price')}</th><th class="r">${L('স্টক মূল্য', 'Value')}</th><th>${L('অবস্থা', 'Status')}</th></tr></thead><tbody>
  ${b.products.filter((p) => p.cat === k && stockMatch(p)).map((p) => { const [cl, t] = stockState(p); return `<tr><td class="num muted">${dg(p.id)}</td><td><b>${esc(p.name)}</b>${pspec(p) ? `<div class="muted" style="font-size:.8rem">${esc(pspec(p))}</div>` : ''}</td>${box ? `<td><span class="pill p-low num">${esc(dg(p.box || '—'))}</span></td>` : ''}<td class="r num">${bn(p.stock)} ${U(p.unit)}</td><td class="r num">${tk(p.buy)}</td><td class="r num">${tk(p.sell)}</td><td class="r num">${tk(p.stock * p.buy)}</td><td><span class="pill ${cl}">${t}</span></td></tr>`; }).join('')}
  </tbody></table></div></div>`).join('')}`;
};

/* ---------- Product catalog ---------- */
// Last unit used per category (e.g. rod: Ton), remembered on this phone/computer.
const unitMem = {
  get: (cat) => { try { return localStorage.getItem('kk-unit:' + cat) || ''; } catch (e) { return ''; } },
  set: (cat, u) => { try { localStorage.setItem('kk-unit:' + cat, u); } catch (e) {} },
};
const OTHER = '__other';
// A choice list with "Other (type)". The chosen or typed value is kept in the text box #id.
function pickField(id, label, opts, val, ph, req) {
  const v = val || '', inList = !v || opts.includes(v);
  return `<div class="f"><label for="${id}-s">${label}${req ? ' <b class="req">*</b>' : ''}</label>
    <select class="in" id="${id}-s" data-pick="${id}"><option value="">${L('— বাছাই করুন —', '— Choose —')}</option>${opts.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}<option value="${OTHER}" ${inList ? '' : 'selected'}>${L('অন্য (নিজে লিখুন)', 'Other (type it)')}</option></select>
    <input class="in" id="${id}" value="${esc(v)}" placeholder="${esc(ph || '')}" maxlength="40" autocomplete="off" aria-label="${esc(label)}" ${inList ? 'hidden' : ''}></div>`;
}
// Big buttons for a short list (MS / SS, Kilogram / Ton). The value is kept in the hidden input #id.
function segField(id, label, opts, val, show) {
  return `<div class="f"><span class="flabel">${label}</span><div class="seg" role="group" aria-label="${esc(label)}">${opts.map((o) => `<button type="button" class="${o === val ? 'on' : ''}" data-seg="${id}" data-v="${o}" aria-pressed="${o === val}">${show(o)}</button>`).join('')}</div><input type="hidden" id="${id}" value="${esc(val)}"></div>`;
}
const KIND_N = { MS: 'MS <small>(Mild Steel)</small>', SS: 'SS <small>(Stainless)</small>' };
const CAT_HINT = {
  rod: { bn: 'ওজন হিসাবে বিক্রি — দাম প্রতি কেজি বা টন।', en: 'Sold by weight — price per kilogram or ton.' },
  cement: { bn: 'দাম প্রতি বস্তা (বা কেজি/টন)।', en: 'Price per bag (or per kg / ton).' },
  tin: { bn: '"এক বান্ডিলে কত পিস" দিলে বিক্রির সময় পিস লিখলেই বান্ডিল হিসাব হবে।', en: 'With pieces per bundle you can sell single pieces — the bundle count is worked out.' },
};
function productForm(p, x = 'c') {
  const b = S.cur, build = btype() === 'build';
  const cat = p?.cat || b.cats[0], sp = SPEC[cat] || SPEC.other;
  if (isVehicle(cat)) return vehicleForm(p, x, cat);
  if (!build) {
    const units = SEG_UNITS[btype()] || Object.keys(UNIT);
    const unit = p?.unit && units.includes(p.unit) ? p.unit : units[0];
    const hasV = b.cats.some(isVehicle);
    return `<div class="form-g" id="${x}-pf">
    <label class="f">${L('ক্যাটাগরি', 'Category')}<select class="in" id="${x}-cat" ${hasV ? `data-pfcat="${x}"` : ''}>${b.cats.map((k) => `<option value="${k}" ${cat === k ? 'selected' : ''}>${CN(k)}</option>`).join('')}</select></label>
    <label class="f">${L('পণ্যের নাম', 'Product name')}<input class="in" id="${x}-name" maxlength="80" value="${esc(p?.name || '')}" placeholder="${L('যেমন: বোরো ধান বীজ (ব্রি-৮৯)', 'e.g. Boro rice seed (BRRI-89)')}"></label>
    <label class="f">${L('একক', 'Unit')}<select class="in" id="${x}-unit">${units.map((u) => `<option value="${u}" ${unit === u ? 'selected' : ''}>${U(u)}</option>`).join('')}</select></label>
    ${priceFields(p, x, b)}</div>`;
  }
  const mem = unitMem.get(cat);
  const unit = p?.unit && sp.units.includes(p.unit) ? p.unit : sp.units.includes(mem) ? mem : sp.units[0];
  const kind = sp.kinds ? (sp.kinds.includes(p?.size) ? p.size : sp.kinds[0]) : '';
  // An existing name that equals the automatic one stays empty, so it follows the details when they change.
  const auto = autoNameOf({ cat, brand: p?.brand, size: sp.kinds ? kind : p?.size, dims: p?.dims });
  const nameVal = p?.name && p.name !== auto ? p.name : '';
  const unitBox = sp.units.length <= 3
    ? segField(`${x}-unit`, L('বিক্রির একক (দাম এই এককে)', 'Selling unit (price is per this unit)'), sp.units, unit, UL)
    : `<label class="f">${L('বিক্রির একক (দাম এই এককে)', 'Selling unit (price is per this unit)')}<select class="in" id="${x}-unit">${sp.units.map((u) => `<option value="${u}" ${unit === u ? 'selected' : ''}>${UL(u)}</option>`).join('')}</select></label>`;
  return `<div id="${x}-pf"><div class="form-g">
    <label class="f">${L('ক্যাটাগরি', 'Category')}<select class="in" id="${x}-cat" data-pfcat="${x}">${b.cats.map((k) => `<option value="${k}" ${cat === k ? 'selected' : ''}>${CN(k)}</option>`).join('')}</select></label>
    ${sp.kinds ? segField(`${x}-size`, L('ধরন', 'Type'), sp.kinds, kind, (k) => KIND_N[k] || k) : ''}
    ${cat !== 'other' ? pickField(`${x}-brand`, sp.brandReq ? L('কোম্পানি', 'Company') : L('কোম্পানি (ঐচ্ছিক)', 'Company (optional)'), sp.brands, p?.brand, L('কোম্পানির নাম লিখুন', 'Type the company name'), sp.brandReq) : ''}
    ${cat === 'tin' ? pickField(`${x}-size`, L('পুরুত্ব', 'Thickness'), sp.thick, p?.size, L('যেমন: 0.32', 'e.g. 0.32')) + pickField(`${x}-dims`, L('মাপ (ফুট)', 'Size (feet)'), sp.dims, p?.dims, L('যেমন: 4*20', 'e.g. 4*20')) : ''}
    ${unitBox}
    ${sp.pack ? `<label class="f">${L('এক বান্ডিলে কত পিস', 'Pieces per bundle')}<input class="in num" type="text" inputmode="decimal" data-amt id="${x}-pack" value="${p?.perPack ?? ''}" placeholder="${L('যেমন: ১২', 'e.g. 12')}"></label>` : ''}
    <label class="f">${cat === 'other' ? L('পণ্যের নাম', 'Product name') : L('পণ্যের নাম (ঐচ্ছিক)', 'Product name (optional)')}<input class="in" id="${x}-name" maxlength="80" value="${esc(nameVal)}" placeholder="${esc(cat === 'other' ? L('যেমন: তারকাটা ৩ ইঞ্চি', 'e.g. Wire nails 3 inch') : auto)}"></label>
    ${priceFields(p, x, b)}
  </div>
  ${CAT_HINT[cat] || sp.kinds ? `<p class="muted fhint">${I('alert')} ${N(CAT_HINT[cat] || CAT_HINT.rod)}${cat !== 'other' ? ' ' + L('নাম খালি রাখলে বিবরণ থেকে নাম তৈরি হবে।', 'Leave the name empty and it is made from the details.') : ''}</p>` : ''}</div>`;
}
const priceFields = (p, x, b) => `${hasBox(b) ? `<label class="f">${L('বক্স / র‍্যাক নম্বর', 'Box / rack no.')}<input class="in" id="${x}-box" maxlength="20" value="${esc(p?.box || '')}" placeholder="B-13"></label>` : ''}
    <label class="f">${L('ক্রয় দর (৳)', 'Cost price (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="${x}-buy" value="${p?.buy ?? ''}"></label>
    <label class="f">${L('বিক্রয় দর (৳)', 'Sale price (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="${x}-sell" value="${p?.sell ?? ''}"></label>
    <label class="f">${L('ন্যূনতম স্টক সতর্কতা', 'Low-stock alert at')}<input class="in num" type="text" inputmode="decimal" data-amt id="${x}-min" value="${p?.min ?? 10}"></label>`;
// Read the details typed so far (used to redraw the form and to save).
function formVals(x) {
  const v = (k) => document.getElementById(`${x}-${k}`), t = (k) => (v(k) ? v(k).value.trim() : '');
  const cat = t('cat');
  return { cat, name: t('name'), brand: t('brand'), size: cat === 'tin' ? normMm(t('size')) : t('size'), dims: cat === 'tin' ? normDims(t('dims')) : '', unit: t('unit'),
    box: t('box'), buy: t('buy'), sell: t('sell'), min: t('min'), perPack: t('pack') };
}
// Category changed: draw the fields for the new category, keeping the name and prices.
function updateProductForm(x) {
  const el = document.getElementById(`${x}-pf`); if (!el) return;
  const f = formVals(x);
  if (isVehicle(f.cat) || S.cur.cats.some(isVehicle)) {
    const v = vehicleVals(x), keep = isVehicle(f.cat) && isVehicle(v.cat) ? v : {};
    el.outerHTML = productForm({ cat: f.cat, name: '', box: f.box, buy: f.buy, sell: f.sell, min: f.min, meta: keep.cat ? keep : null, _paid: v.paid }, x);
    return;
  }
  if (btype() !== 'build') return;
  el.outerHTML = productForm({ cat: f.cat, name: f.name, box: f.box, buy: f.buy, sell: f.sell, min: f.min }, x);
}
// Details changed: show the automatic name in the empty name box.
function updateAutoName(x) {
  const n = document.getElementById(`${x}-name`); if (!n || btype() !== 'build') return;
  const f = formVals(x), a = autoNameOf(f); if (a) n.placeholder = a;
}
const productBody = (x = 'c') => {
  const f = formVals(x), build = btype() === 'build';
  if (isVehicle(f.cat)) return { ...vehicleVals(x), buy: toNum(f.buy), sell: toNum(f.sell), box: f.box };
  if (build && f.unit) unitMem.set(f.cat, f.unit);
  return { name: f.name || (build ? autoNameOf(f) : ''), cat: f.cat, catName: SPEC[f.cat] ? SPEC[f.cat].en : '', unit: f.unit, box: f.box, buy: toNum(f.buy), sell: toNum(f.sell), min: toNum(f.min),
    brand: f.brand, size: f.size, dims: f.dims, weight: '', perPack: f.perPack !== '' ? toNum(f.perPack) : '' };
};
/* ---------- Bikes & cars (one vehicle at a time, with papers) ---------- */
const VBRANDS = { bike: ['Honda', 'Yamaha', 'Bajaj', 'TVS', 'Suzuki', 'Hero', 'Runner', 'Lifan', 'Walton', 'KTM'], car: ['Toyota', 'Honda', 'Nissan', 'Mitsubishi', 'Hyundai', 'Suzuki', 'Mazda', 'Kia', 'Mercedes-Benz', 'BMW'] };
const condName = (c) => (c === 'new' ? L('নতুন', 'New') : L('পুরাতন', 'Used'));
const vName = (cat) => (cat === 'car' ? L('গাড়ি', 'car') : L('বাইক', 'bike'));
function vehicleForm(p, x, cat) {
  const b = S.cur, m = p?.meta || {}, edit = x === 'pe';
  const fixed = cat === 'car' ? 'old' : ['new', 'old'].includes(b.vcond) ? b.vcond : null; // car shops: used only; bike shops set up for one kind
  const cond = fixed || (m.cond === 'new' ? 'new' : 'old');
  const inp = (k, label, val, extra = '') => `<label class="f">${label}<input class="in" id="${x}-v${k}" value="${esc(val ?? '')}" ${extra}></label>`;
  return `<div id="${x}-pf"><div class="form-g">
    <label class="f">${L('ক্যাটাগরি', 'Category')}<select class="in" id="${x}-cat" data-pfcat="${x}">${b.cats.map((k) => `<option value="${k}" ${cat === k ? 'selected' : ''}>${CN(k)}</option>`).join('')}</select></label>
    ${!fixed ? segField(`${x}-vcond`, L(`নতুন না পুরাতন ${vName(cat)}?`, `New or used ${vName(cat)}?`), ['new', 'old'], cond, condName) : `<div class="f"><span class="flabel">${L('ধরন', 'Type')}</span><span class="pill p-low" style="align-self:flex-start;padding:8px 12px">${condName(cond)} ${vName(cat)}</span><input type="hidden" id="${x}-vcond" value="${cond}"></div>`}
    ${pickField(`${x}-vbrand`, L('কোম্পানি', 'Make'), VBRANDS[cat], m.brand, L('কোম্পানির নাম', 'Make'))}
    ${inp('model', L('মডেল *', 'Model *'), m.model, `maxlength="60" placeholder="${cat === 'car' ? 'Axio, Premio' : 'Pulsar 150, FZS'}"`)}
    ${inp('year', L('তৈরির সাল', 'Year of production'), m.year, 'inputmode="numeric" maxlength="4" placeholder="2019"')}
    ${inp('cc', L('সিসি (CC)', 'CC'), m.cc, 'inputmode="numeric" maxlength="5" placeholder="' + (cat === 'car' ? '1500' : '150') + '"')}
    ${inp('color', L('রং', 'Colour'), m.color, `maxlength="30" placeholder="${L('যেমন: লাল', 'e.g. red')}"`)}
    ${inp('engine', L('ইঞ্জিন নম্বর', 'Engine number'), m.engine, 'maxlength="40" autocapitalize="characters" spellcheck="false"')}
    ${inp('chassis', L('চেসিস নম্বর', 'Chassis number'), m.chassis, 'maxlength="40" autocapitalize="characters" spellcheck="false"')}
    ${inp('buydate', L('কেনার তারিখ *', 'Buying date *'), m.buyDate || todayStr(), `type="date" max="${todayStr()}"`)}
  </div>
  ${cond === 'old' ? `<fieldset class="vbox"><legend>${L('পুরাতন — কাগজপত্র ও আগের মালিক', 'Used — papers and previous owner')}</legend><div class="form-g">
    ${inp('regno', L('রেজিস্ট্রেশন নম্বর (ঐচ্ছিক)', 'Registration number (optional)'), m.regNo, `maxlength="40" placeholder="${cat === 'car' ? 'ঢাকা মেট্রো-গ ১২-৩৪৫৬' : 'বগুড়া-ল ১১-২৩৪৫'}"`)}
    ${inp('regdate', L('রেজিস্ট্রেশনের তারিখ (ঐচ্ছিক)', 'Registration date (optional)'), m.regDate, 'type="date"')}
    ${inp('owner', L('আগের মালিকের নাম', 'Previous owner’s name'), m.ownerName, 'maxlength="60"')}
    ${inp('ownerph', L('আগের মালিকের মোবাইল', 'Previous owner’s mobile'), m.ownerPhone, 'type="tel" inputmode="tel" placeholder="01XXXXXXXXX"')}
  </div></fieldset>` : `<fieldset class="vbox"><legend>${L('নতুন — কোথা থেকে কেনা', 'New — bought from')}</legend><div class="form-g">
    ${inp('dealer', L('শোরুম / ডিলারের নাম', 'Showroom / dealer'), m.dealer, `maxlength="80" placeholder="${L('যেমন: উত্তরা মোটরস', 'e.g. Uttara Motors')}"`)}
    ${inp('regno', L('রেজিস্ট্রেশন নম্বর (ঐচ্ছিক)', 'Registration number (optional)'), m.regNo, 'maxlength="40"')}
    ${inp('regdate', L('রেজিস্ট্রেশনের তারিখ (ঐচ্ছিক)', 'Registration date (optional)'), m.regDate, 'type="date"')}
  </div></fieldset>`}
  <div class="form-g" style="margin-top:12px">
    <label class="f">${L('ক্রয় মূল্য (৳) *', 'Buying price (৳) *')}<input class="in num" type="text" inputmode="decimal" data-amt id="${x}-buy" value="${p?.buy ?? ''}"></label>
    <label class="f">${L('বিক্রয় মূল্য / চাওয়া দাম (৳)', 'Selling / asking price (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="${x}-sell" value="${p?.sell ?? ''}"></label>
    ${edit ? '' : `<label class="f">${L('কেনার সময় কত টাকা দিলেন (৳)', 'Paid when buying (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="${x}-vpaid" value="${esc(p?._paid ?? '')}" placeholder="${L('খালি = পুরো টাকা', 'Empty = paid in full')}"></label>`}
    ${hasBox(b) ? `<label class="f">${L('বক্স / জায়গা নম্বর', 'Box / place no.')}<input class="in" id="${x}-box" maxlength="20" value="${esc(p?.box || '')}" placeholder="V-01"></label>` : ''}
  </div>
  <p class="muted fhint">${I('alert')} ${L(`কেনার তারিখে খরচ হিসাবে যোগ হবে। বিক্রি করলে বিক্রির তারিখ ও লাভ "${vName(cat)} রেজিস্টার"-এ দেখা যাবে।`, `Saved as bought on the buying date. When sold, the selling date and profit appear in the ${vName(cat)} register.`)}</p></div>`;
}
function vehicleVals(x) {
  const v = (k) => (document.getElementById(`${x}-v${k}`)?.value || '').trim();
  return { cat: document.getElementById(`${x}-cat`)?.value, cond: v('cond') || 'old', brand: v('brand'), model: v('model'), year: toAscii(v('year')), cc: toAscii(v('cc')), color: v('color'),
    engine: v('engine'), chassis: v('chassis'), buyDate: v('buydate'), regNo: v('regno'), regDate: v('regdate'), ownerName: v('owner'), ownerPhone: pk(v('ownerph')), dealer: v('dealer'),
    paid: v('paid') === '' ? '' : toNum(v('paid')) };
}
// Vehicle details for lists and memos: "Used · 2019 · 160 cc · লাল · Engine KC08… · Chassis ME4…"
const vspec = (p) => { const m = p.meta || {}; return [condName(m.cond), m.year, m.cc && m.cc + ' cc', m.color, m.engine && L('ইঞ্জিন ', 'Engine ') + m.engine, m.chassis && L('চেসিস ', 'Chassis ') + m.chassis, m.regNo].filter(Boolean).join(' · '); };
// One row per vehicle: when and from whom it was bought, when and to whom it was sold.
function vehicleRows(b) {
  const sold = new Map(), bought = new Map();
  for (const s of b.sales) for (const it of s.items) if (!sold.has(it.pid)) sold.set(it.pid, { date: s.date, price: it.price, cust: s.cust, memo: s.id });
  for (const pu of b.purchases) if (!bought.has(pu.items[0].pid)) bought.set(pu.items[0].pid, pu);
  return b.products.filter(isVehicle).map((p) => {
    const m = p.meta || {}, pu = bought.get(p.id), sd = sold.get(p.id), cost = pu ? pu.items[0].price : p.buy;
    const cu = sd && sd.cust ? b.customers.find((c) => c.id === sd.cust) : null;
    const from = m.cond === 'new' ? m.dealer : m.ownerName;
    return { p, m, buyDate: m.buyDate || pu?.date || '', cost, from, sold: sd ? { ...sd, buyer: cu } : null, profit: sd && cost != null ? sd.price - cost : null };
  }).sort((a, z) => (z.sold?.date || z.buyDate).localeCompare(a.sold?.date || a.buyDate));
}
const vMatch = (r, q) => { q = toAscii(q).toLowerCase(); const m = r.m; return [r.p.name, r.p.box, m.brand, m.model, m.year, m.cc, m.color, m.engine, m.chassis, m.regNo, m.ownerName, m.ownerPhone, m.dealer, r.sold?.buyer?.name, r.sold?.buyer?.phone, '#' + r.p.id].filter(Boolean).some((x) => toAscii(String(x)).toLowerCase().includes(q)); };
const monthName = (ym) => new Date(ym + '-01T00:00:00Z').toLocaleDateString(LANG === 'bn' ? 'bn-BD' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
VIEWS.vehicles = () => {
  const b = S.cur, cat = b.cats.find(isVehicle) || 'bike', admin = role() === 'admin';
  const rows = vehicleRows(b), q = (S.vq || '').trim();
  const months = [...new Set(rows.flatMap((r) => [r.buyDate, r.sold?.date]).filter(Boolean).map((d) => d.slice(0, 7)).concat(todayStr().slice(0, 7)))].sort().reverse();
  const mon = S.vm || todayStr().slice(0, 7);
  const list = q ? rows.filter((r) => vMatch(r, q)) : mon === 'all' ? rows : rows.filter((r) => r.buyDate.startsWith(mon) || (r.sold && r.sold.date.startsWith(mon)));
  const inM = (d) => mon === 'all' || (d || '').startsWith(mon);
  const bIn = rows.filter((r) => inM(r.buyDate)), sIn = rows.filter((r) => r.sold && inM(r.sold.date));
  const title = cat === 'car' ? L('গাড়ি রেজিস্টার', 'Car register') : L('বাইক রেজিস্টার', 'Bike register');
  return `<div class="pagehead"><div><h2>${I(cat)} ${title}</h2><p>${L(`প্রতিটি ${cat === 'car' ? 'গাড়ির' : 'বাইকের'} কেনা ও বিক্রির তারিখ, কাগজপত্র আর লাভ — মাস অনুযায়ী বা নম্বর দিয়ে খুঁজুন।`, `Every ${cat === 'car' ? 'car' : 'bike'}’s buying and selling dates, papers and profit — by month or by searching a number.`)}</p></div>
    ${admin ? `<button class="btn" data-nav="catalog">${I('plus')} ${L(`নতুন ${vName(cat)} যোগ`, `Add a ${vName(cat)}`)}</button>` : ''}</div>
  <div class="card">
    <div class="vfilters">
      <span class="searchbar">${I('search')}<input id="vq" type="search" value="${esc(S.vq || '')}" placeholder="${L('মডেল, ইঞ্জিন/চেসিস, রেজি. নম্বর, মালিক বা ক্রেতার মোবাইল', 'Model, engine/chassis, reg. no., owner or buyer mobile')}" autocomplete="off"></span>
      <label class="f" style="flex:0 0 220px">${L('মাস', 'Month')}<select class="in" id="vm" ${q ? 'disabled' : ''}>${months.map((m) => `<option value="${m}" ${m === mon ? 'selected' : ''}>${monthName(m)}</option>`).join('')}<option value="all" ${mon === 'all' ? 'selected' : ''}>${L('সব সময়', 'All time')}</option></select></label>
    </div>
    ${q ? `<p class="muted" style="margin:0 0 10px">${L(`"${esc(q)}" — সব তারিখের ফলাফল (${bn(list.length)} টি)`, `"${esc(q)}" — results from all dates (${bn(list.length)})`)}</p>` : `<div class="vstat">
      <div><span>${L('এই সময়ে কেনা', 'Bought in this period')}</span><b class="num">${bn(bIn.length)} ${L('টি', '')}</b>${admin ? `<span class="num">${tk(bIn.reduce((a, r) => a + (r.cost || 0), 0))}</span>` : ''}</div>
      <div><span>${L('এই সময়ে বিক্রি', 'Sold in this period')}</span><b class="num">${bn(sIn.length)} ${L('টি', '')}</b><span class="num">${tk(sIn.reduce((a, r) => a + r.sold.price, 0))}</span></div>
      ${admin ? `<div><span>${L('বিক্রিতে লাভ', 'Profit on sales')}</span><b class="num" style="color:var(--leaf-d)">${tk(sIn.reduce((a, r) => a + (r.profit || 0), 0))}</b></div>` : ''}
      <div><span>${L('এখন স্টকে', 'In stock now')}</span><b class="num">${bn(rows.filter((r) => !r.sold).length)} ${L('টি', '')}</b></div></div>`}
    ${list.length ? `<div class="tablewrap"><table><thead><tr><th>${vName(cat)}</th><th>${L('ইঞ্জিন / চেসিস', 'Engine / chassis')}</th><th>${L('কেনা', 'Bought')}</th><th>${L('বিক্রি', 'Sold')}</th>${admin ? `<th class="r">${L('লাভ', 'Profit')}</th>` : ''}<th></th></tr></thead><tbody>
    ${list.map((r) => `<tr class="vrow" data-vdet="${r.p.id}"><td><b>${esc(r.p.name)}</b><div class="vmeta">${esc([condName(r.m.cond), r.m.cc && r.m.cc + ' cc', r.m.regNo].filter(Boolean).join(' · '))}</div></td>
      <td class="vmeta num">${esc(r.m.engine || '—')}<br>${esc(r.m.chassis || '—')}</td>
      <td class="num"><b>${fmtDate(r.buyDate)}</b><div class="vmeta">${admin && r.cost != null ? tk(r.cost) + ' · ' : ''}${esc(r.from || '')}</div></td>
      <td class="num">${r.sold ? `<b>${fmtDate(r.sold.date)}</b><div class="vmeta">${tk(r.sold.price)} · ${esc(r.sold.buyer?.name || L('নগদ ক্রেতা', 'Walk-in'))}</div>` : `<span class="pill p-ok">${L('স্টকে আছে', 'In stock')}</span>`}</td>
      ${admin ? `<td class="r num" style="font-weight:700;color:${(r.profit || 0) < 0 ? 'var(--berry)' : 'var(--leaf-d)'}">${r.profit == null ? '—' : tk(r.profit)}</td>` : ''}
      <td class="r"><button class="btn ghost sm" data-vdet="${r.p.id}">${L('বিস্তারিত', 'Details')}</button></td></tr>`).join('')}</tbody></table></div>`
    : `<div class="empty">${q ? L('কিছু পাওয়া যায়নি।', 'Nothing found.') : L('এই মাসে কোনো কেনা বা বিক্রি নেই।', 'Nothing bought or sold this month.')}</div>`}
  </div>`;
};
// All the papers and every date of one vehicle.
function vehicleDetail(pid) {
  const b = S.cur, r = vehicleRows(b).find((x) => x.p.id == pid); if (!r) return;
  const m = r.m, admin = role() === 'admin', days = r.buyDate ? Math.round((Date.parse((r.sold?.date || todayStr()) + 'T00:00:00Z') - Date.parse(r.buyDate + 'T00:00:00Z')) / 86400000) : null;
  const f = (label, val) => (val ? `<div><span>${label}</span><b>${esc(val)}</b></div>` : '');
  modal(`<h3>${I(r.p.cat)} ${esc(r.p.name)}</h3><div style="opacity:.9">#${dg(r.p.id)} · ${condName(m.cond)} · ${r.sold ? L('বিক্রি হয়েছে', 'Sold') : L('স্টকে আছে', 'In stock')}</div>`, `
    <div class="vdates">
      ${m.regDate ? `<div><span>${L('রেজিস্ট্রেশনের তারিখ', 'Registration date')}</span><b class="num">${fmtLong(m.regDate)}</b></div>` : ''}
      <div><span>${L('কেনার তারিখ', 'Buying date')}</span><b class="num">${fmtLong(r.buyDate)}</b>${admin && r.cost != null ? `<span class="num">${tk(r.cost)}</span>` : ''}</div>
      <div><span>${L('বিক্রির তারিখ', 'Selling date')}</span><b class="num">${r.sold ? fmtLong(r.sold.date) : '—'}</b>${r.sold ? `<span class="num">${tk(r.sold.price)} · ${L('মেমো', 'Memo')} #${dg(r.sold.memo)}</span>` : ''}</div>
      ${days != null ? `<div><span>${r.sold ? L('কত দিনে বিক্রি', 'Days to sell') : L('কত দিন ধরে স্টকে', 'Days in stock')}</span><b class="num">${bn(days)} ${L('দিন', 'days')}</b>${admin && r.profit != null ? `<span class="num">${L('লাভ ', 'Profit ')}${tk(r.profit)}</span>` : ''}</div>` : ''}
    </div>
    <div class="vgrid">
      ${f(L('কোম্পানি', 'Make'), m.brand)}${f(L('মডেল', 'Model'), m.model)}${f(L('তৈরির সাল', 'Year'), m.year)}${f('CC', m.cc)}${f(L('রং', 'Colour'), m.color)}
      ${f(L('ইঞ্জিন নম্বর', 'Engine no.'), m.engine)}${f(L('চেসিস নম্বর', 'Chassis no.'), m.chassis)}${f(L('রেজিস্ট্রেশন নম্বর', 'Registration no.'), m.regNo)}
      ${m.cond === 'new' ? f(L('কোথা থেকে কেনা', 'Bought from'), m.dealer) : f(L('আগের মালিক', 'Previous owner'), [m.ownerName, m.ownerPhone && fmtPhone(m.ownerPhone)].filter(Boolean).join(' · '))}
      ${r.sold ? f(L('ক্রেতা', 'Buyer'), r.sold.buyer ? `${r.sold.buyer.name} · ${fmtPhone(r.sold.buyer.phone)}` : L('নগদ ক্রেতা', 'Walk-in customer')) : ''}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">${r.sold ? `<button class="btn ghost" data-showinv="${r.sold.memo}">${I('receipt')} ${L('বিক্রির মেমো', 'Sale memo')}</button>` : ''}
      ${admin ? `<button class="btn ghost" data-editprod="${r.p.id}">${I('edit')} ${L('বদলান', 'Edit')}</button>` : ''}<button class="btn" data-close>${L('বন্ধ করুন', 'Close')}</button></div>`, { width: 640 });
}

VIEWS.catalog = () => {
  const b = S.cur;
  return `<div class="pagehead"><div><h2>${L('পণ্য তালিকা', 'Product catalog')}</h2><p>${L('নতুন পণ্য যোগ করুন, দর বদলান। স্টক যোগ হয় ক্রয় থেকে।', 'Add products and change prices. Stock is added through Purchases.')}</p></div></div>
  <div class="card"><h3 style="margin-bottom:10px">${I('plus')} ${L('নতুন পণ্য যোগ', 'Add product')}</h3>${productForm(null)}
    <div style="margin-top:12px"><button class="btn" data-addprod>${I('check')} ${L('পণ্য সেভ করুন', 'Save product')}</button></div></div>
  ${!b.products.length ? `<div class="card empty" style="text-align:center;padding:22px">${I('tag')} <b>${L('এখনো কোনো পণ্য নেই', 'No products yet')}</b><br><span class="muted">${L('উপরের ফর্মে প্রথম পণ্যটি লিখে সেভ করুন। তারপর "ক্রয়" থেকে স্টক যোগ করুন।', 'Fill in the form above and save your first product. Then add stock from Purchases.')}</span></div>` : ''}
  <div class="card" ${b.products.length ? '' : 'hidden'}><div class="tablewrap"><table><thead><tr><th>${L('আইডি', 'ID')}</th><th>${L('পণ্য', 'Product')}</th><th>${L('ক্যাটাগরি', 'Category')}</th><th>${L('একক', 'Unit')}</th>${hasBox(b) ? `<th>${L('বক্স', 'Box')}</th>` : ''}<th class="r">${L('ক্রয়', 'Cost')}</th><th class="r">${L('বিক্রয়', 'Price')}</th><th class="r">${L('লাভ/একক', 'Profit/unit')}</th><th></th></tr></thead><tbody>
  ${b.products.map((p) => `<tr><td class="num muted">#${dg(p.id)}</td><td><b>${esc(p.name)}</b>${pspec(p) ? `<div class="muted" style="font-size:.8rem">${esc(pspec(p))}</div>` : ''}</td><td>${catPill(p.cat)}</td><td>${UL(p.unit)}</td>${hasBox(b) ? `<td class="num">${esc(dg(p.box || '—'))}</td>` : ''}<td class="r num">${tk(p.buy)}</td><td class="r num">${tk(p.sell)}</td><td class="r num" style="color:var(--leaf-d);font-weight:700">${tk(p.sell - p.buy)}</td>
  <td class="r" style="white-space:nowrap"><button class="btn ghost sm" data-editprod="${p.id}">${I('edit')} ${L('বদলান', 'Edit')}</button></td></tr>`).join('')}
  </tbody></table></div></div>`;
};
function editProduct(id) {
  const p = S.cur.products.find((x) => x.id == id); if (!p) return;
  modal(`<h3>${I('edit')} ${L('পণ্য বদলান', 'Edit product')}</h3><div style="opacity:.9">#${dg(p.id)} · ${esc(p.name)}</div>`, `${productForm(p, 'pe')}
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn red sm" data-delprod="${p.id}">${I('trash')} ${L('তালিকা থেকে সরান', 'Remove from list')}</button>
    <div style="display:flex;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" data-saveprod="${p.id}">${I('check')} ${L('সেভ করুন', 'Save')}</button></div></div>`);
}

/* ---------- Purchases ---------- */
VIEWS.purchase = () => {
  const b = S.cur;
  return `<div class="pagehead"><div><h2>${L('ক্রয় ও ভেন্ডর বিল', 'Purchases & vendor bills')}</h2><p>${L('কোম্পানি/ডিলার থেকে মাল কিনলে এখানে এন্ট্রি দিন — স্টক বাড়বে, দেনা হিসাব হবে।', 'Record stock bought from a company or dealer — stock goes up and the unpaid part is tracked.')}</p></div>
  <button class="btn ghost" data-addvendor>${I('plus')} ${L('নতুন ভেন্ডর', 'New vendor')}</button></div>
  ${!b.products.filter((p) => !isVehicle(p)).length ? `<div class="card empty" style="text-align:center;padding:22px">${I('tag')} <b>${L('আগে পণ্য তালিকায় পণ্য যোগ করুন', 'Add products to the catalog first')}</b><br><span class="muted">${L('তারপর এখানে কোম্পানি/ডিলার থেকে কেনা মালের বিল দিন — স্টক বাড়বে।', 'Then record bills for goods bought from companies or dealers here — stock goes up.')}</span><br><button class="btn sm" style="margin-top:10px" data-nav="catalog">${I('plus')} ${L('পণ্য যোগ করুন', 'Add products')}</button></div>` : b.vendors.length ? `<div class="card"><h3 style="margin-bottom:10px">${I('truck')} ${L('নতুন ক্রয় বিল', 'New purchase bill')}</h3>
  <div class="form-g">
    <label class="f">${L('ভেন্ডর / কোম্পানি', 'Vendor / company')}<select class="in" id="p-vendor">${b.vendors.map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select></label>
    <label class="f">${L('পণ্য', 'Product')}<select class="in" id="p-prod">${b.products.filter((p) => !isVehicle(p)).map((p) => `<option value="${p.id}">#${dg(p.id)} ${esc(p.name)} (${U(p.unit)})</option>`).join('')}</select></label>
    <label class="f">${L('পরিমাণ', 'Quantity')}<input class="in num" type="text" inputmode="decimal" data-amt id="p-qty" value="10"></label>
    <label class="f">${L('ক্রয় দর / একক (৳)', 'Cost per unit (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="p-rate" value="${b.products[0]?.buy || 0}"></label>
    <label class="f">${L('এখন পরিশোধ (৳)', 'Paid now (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="p-paid" placeholder="${L('০ = পুরোটা বাকি', '0 = all on credit')}"></label>
  </div>
  <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn" data-savepur>${I('check')} ${L('বিল সেভ করুন', 'Save bill')}</button><span class="muted num" id="p-total"></span></div></div>`
  : `<div class="card empty">${L('আগে একজন ভেন্ডর (কোম্পানি/ডিলার) যোগ করুন।', 'Add a vendor (company/dealer) first.')}</div>`}
  <div class="card"><h3 style="margin-bottom:8px">${I('users')} ${L('ভেন্ডর', 'Vendors')}</h3><div class="tablewrap"><table><thead><tr><th>${L('নাম', 'Name')}</th><th>${L('মোবাইল', 'Mobile')}</th><th class="r">${L('দেনা', 'Owed')}</th></tr></thead><tbody>
    ${b.vendors.map((v) => `<tr><td><b>${esc(v.name)}</b></td><td class="num muted">${esc(dg(fmtPhone(v.phone)))}</td><td class="r num">${v.due ? `<span class="pill p-due">${tk(v.due)}</span>` : `<span class="pill p-ok">${L('নেই', 'None')}</span>`}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><h3 style="margin-bottom:8px">${I('file')} ${L('ক্রয় বিলের তালিকা', 'Purchase bills')}</h3>${b.purchases.length ? `<div class="tablewrap"><table><thead><tr><th>${L('তারিখ', 'Date')}</th><th>${L('ভেন্ডর', 'Vendor')}</th><th>${L('পণ্য', 'Product')}</th><th class="r">${L('পরিমাণ', 'Qty')}</th><th class="r">${L('মোট', 'Total')}</th><th class="r">${L('পরিশোধ', 'Paid')}</th><th></th></tr></thead><tbody>
    ${b.purchases.slice().reverse().map((p) => { const pr = b.products.find((x) => x.id === p.items[0].pid); return `<tr><td class="num">${fmtDate(p.date)}</td><td>${esc(b.vendors.find((v) => v.id === p.vendor)?.name || '—')}</td><td>${esc(pr?.name || '—')}</td><td class="r num">${bn(p.items[0].qty)} ${pr ? U(pr.unit) : ''}</td><td class="r num">${tk(p.total)}</td><td class="r num">${p.paid >= p.total ? `<span class="pill p-ok">${tk(p.paid)}</span>` : tk(p.paid)}</td>
      <td class="r"><button class="btn ghost sm" data-voidpur="${p.id}" title="${L('ভুল বিল বাতিল করুন', 'Cancel a wrong bill')}">${I('x')} ${L('বাতিল', 'Cancel')}</button></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">${L('এখনো কোনো ক্রয় বিল নেই।', 'No purchase bills yet.')}</div>`}</div>`;
};
after.purchase = () => {
  if (!$('#p-qty')) return;
  const f = () => { $('#p-total').textContent = L('মোট বিল: ', 'Bill total: ') + tk(toNum($('#p-qty').value) * toNum($('#p-rate').value)); };
  ['#p-qty', '#p-rate'].forEach((s) => $(s).addEventListener('input', f));
  $('#p-prod').addEventListener('change', (e) => { $('#p-rate').value = S.cur.products.find((p) => p.id == e.target.value).buy; f(); });
  f();
};
function addVendor() {
  modal(`<h3>${I('truck')} ${L('নতুন ভেন্ডর', 'New vendor')}</h3>`, `
    <label class="f">${L('ভেন্ডর / কোম্পানির নাম', 'Vendor / company name')}<input class="in" id="v-name" maxlength="80"></label>
    <label class="f">${L('মোবাইল (ঐচ্ছিক)', 'Mobile (optional)')}<input class="in num" id="v-phone" type="tel" placeholder="01XXXXXXXXX"></label>
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" data-savevendor>${I('check')} ${L('সেভ করুন', 'Save')}</button></div>`, { width: 460 });
}

/* ---------- Orders ---------- */
VIEWS.orders = () => `<div class="pagehead"><div><h2>${L('অর্ডার ও ইনভয়েস', 'Orders & invoices')}</h2><p>${L('সব বিক্রির মেমো। ভুল মেমো বাতিল করলে স্টক ও বাকি আগের অবস্থায় ফিরে যায়।', 'Every sale memo. Cancelling a wrong memo puts the stock and due back.')}</p></div><button class="btn sun" data-nav="sale">${I('plus')} ${L('নতুন অর্ডার', 'New order')}</button></div>
  <div class="card">${salesTable(S.cur.sales.slice().reverse(), false, true)}</div>`;

/* ---------- Dues ---------- */
VIEWS.dues = () => {
  const b = S.cur, c = calc(b);
  return `<div class="pagehead"><div><h2>${L('বাকি হিসাব', 'Dues')}</h2><p>${L('কে কত টাকা বাকি রেখেছে, আর আপনি কোম্পানিকে কত দেবেন।', 'Who owes you, and what you owe vendors.')}</p></div></div>
  <div class="grid g-kpi">${kpi('k-berry', 'hand', L('কাস্টমারের কাছে পাওনা', 'Owed by customers'), tk(c.recv))}${kpi('k-soil', 'truck', L('ভেন্ডরকে দেনা', 'Owed to vendors'), tk(c.pay))}${kpi('k-sky', 'money', L('ক্যাশ ব্যালেন্স', 'Cash balance'), tk(c.cash))}</div>
  <div class="grid g2">
  <div class="card"><h3 style="margin-bottom:8px">${I('users')} ${L('কাস্টমার বাকি (পাওনা)', 'Customer dues')}</h3><div class="tablewrap"><table><thead><tr><th>${L('ক্রেতা', 'Customer')}</th><th class="r">${L('বাকি', 'Due')}</th><th>${L('জমা নিন', 'Collect')}</th></tr></thead><tbody>
    ${b.customers.slice().sort((a, z) => z.due - a.due).map((cu) => `<tr><td><button class="linkbtn" data-person="c:${cu.id}"><b>${esc(cu.name)}</b></button><div class="muted num" style="font-size:.8rem">${esc(cu.village)} · ${esc(dg(fmtPhone(cu.phone)))}</div></td><td class="r num">${cu.due ? `<span class="pill p-due">${tk(cu.due)}</span>` : `<span class="pill p-ok">${L('নেই', 'None')}</span>`}</td>
    <td>${cu.due ? `<div style="display:flex;gap:6px"><input class="in num" type="text" inputmode="decimal" data-amt style="width:100px" id="col-${cu.id}" placeholder="৳" aria-label="${L('জমার টাকা', 'Amount')}"><button class="btn sm" data-collect="${cu.id}">${L('জমা', 'Collect')}</button></div>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><h3 style="margin-bottom:8px">${I('truck')} ${L('ভেন্ডর দেনা', 'Vendor dues')}</h3><div class="tablewrap"><table><thead><tr><th>${L('ভেন্ডর', 'Vendor')}</th><th class="r">${L('দেনা', 'Owed')}</th><th>${L('পরিশোধ', 'Pay')}</th></tr></thead><tbody>
    ${b.vendors.map((v) => `<tr><td><b>${esc(v.name)}</b></td><td class="r num">${v.due ? `<span class="pill p-due">${tk(v.due)}</span>` : `<span class="pill p-ok">${L('নেই', 'None')}</span>`}</td>
    <td>${v.due ? `<div style="display:flex;gap:6px"><input class="in num" type="text" inputmode="decimal" data-amt style="width:100px" id="vp-${v.id}" placeholder="৳" aria-label="${L('টাকা', 'Amount')}"><button class="btn sm sun" data-vpay="${v.id}">${L('দিন', 'Pay')}</button></div>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
  </div>`;
};

/* ---------- Expenses ---------- */
VIEWS.expense = () => {
  const b = S.cur, tot = b.expenses.reduce((a, e) => a + e.amount, 0);
  return `<div class="pagehead"><div><h2>${L('খরচ হিসাব', 'Expenses')}</h2><p>${L('দোকান ভাড়া, বেতন, পরিবহন — সব খরচ লাভ থেকে বাদ যাবে।', 'Rent, wages, transport — every expense comes off profit.')}</p></div><div class="kpi k-berry" style="padding:10px 16px"><div class="lbl">${L('মোট খরচ', 'Total expenses')}</div><div class="val num" style="font-size:1.3rem">${tk(tot)}</div></div></div>
  <div class="card"><div class="form-g">
    <label class="f">${L('খরচের ধরন', 'Type')}<select class="in" id="e-type">${Object.keys(EXP).map((k) => `<option value="${k}">${N(EXP[k])}</option>`).join('')}</select></label>
    <label class="f">${L('টাকা (৳)', 'Amount (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="e-amt"></label>
    <label class="f">${L('নোট', 'Note')}<input class="in" id="e-note" maxlength="120" placeholder="${L('ঐচ্ছিক', 'Optional')}"></label>
  </div><div style="margin-top:12px"><button class="btn" data-addexp>${I('plus')} ${L('খরচ যোগ করুন', 'Add expense')}</button></div></div>
  <div class="card"><div class="tablewrap"><table><thead><tr><th>${L('তারিখ', 'Date')}</th><th>${L('ধরন', 'Type')}</th><th>${L('নোট', 'Note')}</th><th class="r">${L('টাকা', 'Amount')}</th><th></th></tr></thead><tbody>
  ${b.expenses.slice().reverse().map((e) => `<tr><td class="num">${fmtDate(e.date)}</td><td><b>${esc(N(EXP[e.type] || e.type))}</b></td><td class="muted">${esc(e.note)}</td><td class="r num">${tk(e.amount)}</td><td class="r"><button class="iconbtn" data-delexp="${e.id}" title="${L('মুছে ফেলুন', 'Delete')}" aria-label="${L('খরচ মুছে ফেলুন', 'Delete expense')}">${I('trash')}</button></td></tr>`).join('') || `<tr><td colspan="5" class="muted" style="text-align:center;padding:18px">${L('এখনো কোনো খরচ নেই।', 'No expenses yet.')}</td></tr>`}</tbody><tfoot><tr><td colspan="3"><b>${L('মোট খরচ', 'Total expenses')}</b></td><td class="r num"><b>${tk(tot)}</b></td><td></td></tr></tfoot></table></div></div>`;
};

/* ---------- Report ---------- */
// Report period: this month, last month, this year or everything.
const PERIODS = { month: { bn: 'এই মাস', en: 'This month' }, last: { bn: 'গত মাস', en: 'Last month' }, year: { bn: 'এই বছর', en: 'This year' }, all: { bn: 'শুরু থেকে', en: 'All time' } };
function periodRange(k) {
  const t = todayStr(), y = +t.slice(0, 4), m = +t.slice(5, 7);
  if (k === 'month') return [t.slice(0, 7) + '-01', t];
  if (k === 'last') { const ly = m === 1 ? y - 1 : y, lm = m === 1 ? 12 : m - 1, mm = String(lm).padStart(2, '0'); return [`${ly}-${mm}-01`, `${ly}-${mm}-${new Date(Date.UTC(ly, lm, 0)).getUTCDate()}`]; }
  if (k === 'year') return [`${y}-01-01`, t];
  return ['0000-00-00', '9999-12-31'];
}
VIEWS.report = () => {
  const b = S.cur, c = calc(b), per = S.rper || 'month', [from, to] = periodRange(per);
  const inP = (d) => d >= from && d <= to;
  const sales = b.sales.filter((s) => inP(s.date)), exps = b.expenses.filter((e) => inP(e.date));
  const ps = sales.reduce((a, s) => a + s.total, 0), pc = sales.reduce((a, s) => a + s.items.reduce((x, it) => x + (it.cost ?? 0) * it.qty, 0), 0), pe = exps.reduce((a, e) => a + e.amount, 0);
  const rows = b.products.map((p) => { let q = 0, rev = 0, cost = 0; sales.forEach((s) => s.items.filter((i) => i.pid == p.id).forEach((i) => { q += i.qty; rev += i.qty * i.price; cost += i.qty * (i.cost || 0); })); return { p, q, rev, prof: rev - cost }; }).filter((r) => r.q).sort((a, z) => z.prof - a.prof);
  const net = ps - pc - pe;
  return `<div class="pagehead"><div><h2>${L('লাভ-ক্ষতি ও ব্যালেন্স', 'Profit, loss & balance')}</h2><p>${per === 'all' ? L('শুরু থেকে আজ পর্যন্ত।', 'From the start until today.') : `${fmtLong(from)} – ${fmtLong(to > todayStr() ? todayStr() : to)}`}</p></div>
    <div class="seg seg-sm" role="group" aria-label="${L('সময়কাল', 'Period')}">${Object.keys(PERIODS).map((k) => `<button type="button" class="${per === k ? 'on' : ''}" data-rper="${k}" aria-pressed="${per === k}">${N(PERIODS[k])}</button>`).join('')}</div></div>
  <div class="grid g2">
    <div class="card"><h3 style="margin-bottom:10px">${I('trend')} ${L('লাভ-ক্ষতি বিবরণী', 'Profit & loss')} <span class="pill p-low" style="font-size:.75rem">${N(PERIODS[per])}</span></h3><div class="summary num">
      <div><span>${L('মোট বিক্রি', 'Total sales')} <small class="muted">(${bn(sales.length)} ${L('টি মেমো', 'memos')})</small></span><b>${tk(ps)}</b></div>
      <div><span class="muted">(−) ${L('বিক্রিত পণ্যের ক্রয় মূল্য', 'Cost of goods sold')}</span><span>${tk(pc)}</span></div>
      <div><b>${L('মোট লাভ', 'Gross profit')}</b><b>${tk(ps - pc)}</b></div>
      <div><span class="muted">(−) ${L('পরিচালন খরচ', 'Operating expenses')}</span><span>${tk(pe)}</span></div>
      <div><span class="grand">${net < 0 ? L('নিট ক্ষতি', 'Net loss') : L('নিট লাভ', 'Net profit')}</span><span class="grand" ${net < 0 ? 'style="color:var(--berry)"' : ''}>${tk(Math.abs(net))}</span></div></div></div>
    <div class="card"><h3 style="margin-bottom:10px">${I('money')} ${L('ব্যালেন্স শিট (আজ)', 'Balance sheet (today)')}</h3><div class="summary num">
      <div><span>${L('হাতে নগদ', 'Cash in hand')}</span><b>${tk(c.cash)}</b></div>
      <div><span>${L('স্টকের মূল্য', 'Stock value')}</span><b>${tk(c.stockVal)}</b></div>
      <div><span>${L('কাস্টমারের কাছে পাওনা', 'Receivable from customers')}</span><b>${tk(c.recv)}</b></div>
      <div><span class="muted">(−) ${L('ভেন্ডরকে দেনা', 'Payable to vendors')}</span><span class="due">${tk(c.pay)}</span></div>
      <div><span class="grand">${L('ব্যবসার মোট মূলধন', 'Business net worth')}</span><span class="grand">${tk(c.cash + c.stockVal + c.recv - c.pay)}</span></div></div>
      <button class="btn ghost sm" style="margin-top:10px" data-opening>${I('edit')} ${L('শুরুর নগদ ব্যালেন্স', 'Opening cash')}: ${tk(b.opening)}</button></div>
  </div>
  <div class="card"><h3 style="margin-bottom:8px">${BI()} ${L('কোন পণ্যে কত লাভ', 'Profit by product')}</h3>${rows.length ? `<div class="tablewrap"><table><thead><tr><th>${L('পণ্য', 'Product')}</th><th class="r">${L('বিক্রি পরিমাণ', 'Qty sold')}</th><th class="r">${L('বিক্রি', 'Sales')}</th><th class="r">${L('লাভ', 'Profit')}</th></tr></thead><tbody>
  ${rows.map((r) => `<tr><td><div class="pname">${esc(r.p.name)}</div>${catPill(r.p.cat)}</td><td class="r num">${bn(r.q)} ${U(r.p.unit)}</td><td class="r num">${tk(r.rev)}</td><td class="r num" style="color:${r.prof < 0 ? 'var(--berry)' : 'var(--leaf-d)'};font-weight:700">${tk(r.prof)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${L('এই সময়ে কোনো বিক্রি নেই।', 'No sales in this period.')}</div>`}</div>`;
};

/* ---------- Sellers & access ---------- */
VIEWS.team = () => {
  const b = S.cur;
  const yes = `<span class="pill p-ok">✓ ${L('হ্যাঁ', 'Yes')}</span>`, no = `<span class="pill p-out">✕ ${L('না', 'No')}</span>`;
  return `<div class="pagehead"><div><h2>${L('সেলার ও সেটিংস', 'Sellers & access')}</h2><p>${L('প্রত্যেকের আলাদা আইডি (মোবাইল নম্বর) ও পাসওয়ার্ড। সর্বোচ্চ ৩ জন সেলার।', 'Everyone has their own ID (mobile number) and password. Up to 3 sellers.')}${S.otp ? L(' নতুন আইডি ও পাসওয়ার্ড বদলাতে OTP লাগে।', ' New IDs and password changes need an OTP.') : ''}</p></div></div>
  <div class="grid g3">
    <div class="card bizcard"><div class="top2"><div class="av" style="background:var(--sun)">${I('shield')}</div><div><h3>${esc(b.admin.name)}</h3><span class="pill p-low">${L('অ্যাডমিন', 'Admin')}</span></div></div>
      <div class="summary num"><div><span class="muted">${L('আইডি (মোবাইল)', 'ID (mobile)')}</span><b>${esc(dg(fmtPhone(b.admin.phone)))}</b></div></div>
      ${S.me.role === 'admin' ? `<button class="btn ghost sm" data-ownpass>${I('shield')} ${L('আমার পাসওয়ার্ড বদলান', 'Change my password')}</button>` : ''}</div>
    ${b.sellers.map((s) => { const ss = b.sales.filter((x) => x.seller === s.id); return `<div class="card bizcard"><div class="top2"><div class="av" style="background:var(--leaf)">${I('user')}</div><div><h3>${esc(s.name)}</h3><span class="pill p-ok">${s.id}</span></div></div>
      <div class="summary num"><div><span class="muted">${L('আইডি (মোবাইল)', 'ID (mobile)')}</span><b>${esc(dg(fmtPhone(s.phone)))}</b></div><div><span class="muted">${L('মোট বিক্রি', 'Total sales')}</span><b>${tk(ss.reduce((a, x) => a + x.total, 0))}</b></div><div><span class="muted">${L('মেমো', 'Memos')}</span><b>${bn(ss.length)}</b></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost sm" data-sellerpass="${s.uid}">${I('shield')} ${L('পাসওয়ার্ড বদলান', 'Change password')}</button><button class="btn ghost sm" data-rmseller="${s.uid}">${I('trash')} ${L('বাদ দিন', 'Remove')}</button></div></div>`; }).join('')}
    ${b.sellers.length < 3 ? `<div class="card newbiz" data-addseller role="button" tabindex="0"><div class="plus">${I('plus')}</div><h3>${L('সেলার যোগ করুন', 'Add seller')}</h3><span class="muted">${L(`${bn(3 - b.sellers.length)} টি আইডি বাকি আছে`, `${bn(3 - b.sellers.length)} IDs left`)}</span></div>` : ''}
  </div>
  ${appCard('shop')}
  <div class="card"><h3 style="margin-bottom:10px">${I('shield')} ${L('কে কী করতে পারবে', 'Who can do what')}</h3><div class="tablewrap"><table><thead><tr><th>${L('সুবিধা', 'Action')}</th><th>${L('অ্যাডমিন', 'Admin')}</th><th>${L('সেলার', 'Seller')}</th></tr></thead><tbody>
    ${[[L('বিক্রি এন্ট্রি / ইনভয়েস', 'Enter sales / invoices'), 1], [L('নিজের বিক্রি দেখা', 'See own sales'), 1], [L('নিজের পাসওয়ার্ড বদলানো', 'Change own password'), 1], [L('দর পরিবর্তন', 'Change prices'), 0], [L('ক্রয় মূল্য ও লাভ দেখা', 'See cost prices and profit'), 0], [L('স্টক ও ক্রয়', 'Stock & purchases'), 0], [L('বাকি জমা / ভেন্ডর পরিশোধ', 'Collect dues / pay vendors'), 0], [L('খরচ এন্ট্রি', 'Enter expenses'), 0], [L('মেমো বাতিল', 'Cancel memos'), 0], [L('সেলার যোগ / বাদ', 'Add / remove sellers'), 0]].map(([t, s]) => `<tr><td>${t}</td><td>${yes}</td><td>${s ? yes : no}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};
function addSeller() {
  modal(`<h3>${I('user')} ${L('নতুন সেলার আইডি', 'New seller ID')}</h3><div style="opacity:.9">${esc(S.cur.name)}</div>`, `
    <label class="f">${L('সেলারের নাম', 'Seller name')}<input class="in" id="as-name" maxlength="60"></label>
    <label class="f">${L('মোবাইল নম্বর (এটাই আইডি)', 'Mobile number (login ID)')}<input class="in num" id="as-phone" type="tel" placeholder="01XXXXXXXXX"></label>
    <label class="f">${L('পাসওয়ার্ড', 'Password')}<input class="in" id="as-pass" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="new-password"></label>
    <div data-rulesfor="as-pass">${rulesHTML('')}</div>
    ${S.otp ? `<p class="muted" style="margin:0;font-size:.85rem">${L('সেলারের মোবাইলে OTP যাবে। সেলার কোডটি বললে আইডি চালু হবে।', 'An OTP goes to the seller’s mobile. The ID opens once they tell you the code.')}</p>` : ''}
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" data-assave>${I('check')} ${L('সেভ করুন', 'Save')}</button></div>`, { width: 520 });
}

/* ---------- Customer website preview ---------- */
VIEWS.shop = () => {
  const b = S.cur, url = publicUrl(b.slug);
  return `<div class="pagehead"><div><h2>${L('কাস্টমার ওয়েবসাইট', 'Customer website')}</h2><p>${L('কৃষকরা এই ঠিকানায় আপনার পণ্য ও দাম দেখতে পাবেন (ক্রয় মূল্য বা স্টকের পরিমাণ দেখাবে না)।', 'Farmers can see your products and prices at this address (no cost prices or stock quantities).')}</p></div></div>
  <div class="card"><div class="urlbox">${esc(url)}</div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">${I('globe')} ${L('খুলুন', 'Open')}</a><button class="btn ghost" data-copy="${esc(url)}">${L('লিংক কপি', 'Copy link')}</button></div></div>`;
};

/* ---------- Billing & lock screen ---------- */
function renewCard(b) {
  const P = b.plans;
  return `<div class="card" style="border-color:var(--sun)"><h3 style="margin-bottom:10px">${I('crown')} ${L('কীভাবে নবায়ন করবেন', 'How to renew')}</h3>
    <div class="grid g2">
      <div class="summary num">${P.introLeft ? `<div><span>${L('শুরুর অফার', 'Starter offer')}</span><b style="color:var(--leaf-d)">${L(`পরের ${dg(P.introLeft)} মাস ${tk(P.introPrice)} করে`, `next ${P.introLeft} month(s) at ${tk(P.introPrice)}`)}</b></div>` : ''}<div><span>${N(PLAN_N.monthly)}</span><b>${tk(P.monthly)} ${L('/ মাস', '/ month')}</b></div><div><span>${N(PLAN_N.yearly)}</span><b>${tk(P.yearly)} ${L('/ বছর', '/ year')}</b></div>
        ${P.monthly * 12 > P.yearly ? `<div><span class="muted">${L('বার্ষিকে সাশ্রয়', 'Yearly saves')}</span><b style="color:var(--leaf-d)">${tk(P.monthly * 12 - P.yearly)}</b></div>` : ''}</div>
      <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
        <li>${L(`বিকাশ / নগদে <b class="num">${esc(dg(fmtPhone(P.payTo)))}</b> নম্বরে টাকা পাঠান।`, `Send the money by bKash / Nagad to <b class="num">${esc(fmtPhone(P.payTo))}</b>.`)}</li>
        <li>${L(`রেফারেন্সে লিখুন: <b>KK-${dg(b.id)}</b>`, `Use reference <b>KK-${b.id}</b>.`)}</li>
        <li>${L('ট্রানজেকশন আইডি সহ ফোন করুন। নিশ্চিত হলে অ্যাকাউন্ট সাথে সাথে চালু হবে।', 'Call with the transaction ID. Your account opens as soon as it is confirmed.')}</li></ol>
    </div></div>`;
}
VIEWS.billing = () => {
  const b = S.cur, st = subStateOf(b.sub), dl = daysTo(b.sub.expiry);
  return `<div class="pagehead"><div><h2>${L('আমার সাবস্ক্রিপশন', 'My subscription')}</h2></div></div>
  <div class="grid g-kpi">
    ${kpi('k-sun', 'crown', L('প্ল্যান', 'Plan'), N(PLAN_N[b.sub.plan]), subPill(b.sub))}
    ${kpi(st === 'active' ? 'k-leaf' : 'k-berry', 'alert', L('মেয়াদ শেষ', 'Expires'), fmtDate(b.sub.expiry), dl >= 0 ? L(`${bn(dl)} দিন বাকি`, `${bn(dl)} days left`) : L(`${bn(-dl)} দিন আগে শেষ`, `Ended ${bn(-dl)} days ago`))}
    ${kpi('k-sky', 'money', L('মোট পরিশোধ', 'Total paid'), tk(b.sub.payments.reduce((a, p) => a + p.amount, 0)), L(`${bn(b.sub.payments.length)} টি পেমেন্ট`, `${bn(b.sub.payments.length)} payments`))}
  </div>
  ${renewCard(b)}
  <div class="card"><h3 style="margin-bottom:8px">${I('receipt')} ${L('পেমেন্টের ইতিহাস', 'Payment history')}</h3>
    ${b.sub.payments.length ? `<div class="tablewrap"><table><thead><tr><th>${L('তারিখ', 'Date')}</th><th>${L('প্ল্যান', 'Plan')}</th><th>${L('মাধ্যম', 'Method')}</th><th class="r">${L('টাকা', 'Amount')}</th></tr></thead><tbody>
    ${b.sub.payments.slice().reverse().map((p) => `<tr><td class="num">${fmtLong(p.date)}</td><td>${N(PLAN_N[p.plan])} × ${bn(p.qty)}</td><td>${N(METHOD[p.method])} ${p.ref ? `<span class="muted num">${esc(p.ref)}</span>` : ''}</td><td class="r num">${tk(p.amount)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${L('এখনো কোনো পেমেন্ট নেই।', 'No payments yet.')}</div>`}
  </div>`;
};
VIEWS.locked = () => {
  const b = S.cur, st = subStateOf(b.sub);
  return `<div class="card" style="text-align:center;padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:10px">
    <div style="width:70px;height:70px;border-radius:20px;display:grid;place-items:center;background:var(--berry-l);color:var(--berry)">${I('alert')}</div>
    <h2 style="font-size:1.6rem">${st === 'off' ? L('অ্যাকাউন্টটি বন্ধ করা হয়েছে', 'This account has been deactivated') : L('সাবস্ক্রিপশনের মেয়াদ শেষ', 'Subscription expired')}</h2>
    <p class="muted" style="max-width:52ch;margin:0">${st === 'off' ? L('সফটওয়্যার প্রদানকারী এই অ্যাকাউন্ট বন্ধ রেখেছেন। আপনার সব হিসাব নিরাপদে রাখা আছে।', 'The provider has switched this account off. All your records are kept safe.') : L(`মেয়াদ শেষ হয়েছে ${fmtLong(b.sub.expiry)}। নবায়ন করলেই আবার সব হিসাব দেখতে ও বিক্রি করতে পারবেন। আপনার ডেটা মুছে যায়নি।`, `It ended on ${fmtLong(b.sub.expiry)}. Renew to get back to your records. Nothing has been deleted.`)}</p>
    ${role() === 'seller' ? `<p style="margin:0"><b>${L('দোকানের মালিকের সাথে যোগাযোগ করুন।', 'Please contact the shop owner.')}</b></p>` : `<button class="btn sun" data-nav="billing">${I('crown')} ${L('নবায়নের নিয়ম দেখুন', 'See how to renew')}</button>`}
  </div>${role() === 'admin' ? renewCard(b) : ''}`;
};
function showNotes() {
  const list = S.cur.notes || [];
  modal(`<h3>${I('bell')} ${L('নোটিফিকেশন', 'Notifications')}</h3><div style="opacity:.9">${L('এগুলো আপনার মোবাইলে SMS হিসেবেও যায়', 'These are also sent to your mobile by SMS')}</div>`,
    `${list.length ? list.map((n) => `<div class="summary" style="${n.read ? '' : 'border-color:var(--sun);background:var(--sun-l)'}"><b style="display:block">${esc(N(n.text))}</b><span class="muted" style="font-size:.8rem">${fmtLong(n.d)}</span></div>`).join('') : `<div class="empty">${L('কোনো নোটিফিকেশন নেই।', 'No notifications.')}</div>`}
    <div style="text-align:right"><button class="btn" data-close>${L('বন্ধ করুন', 'Close')}</button></div>`, { label: L('নোটিফিকেশন', 'Notifications') });
  if (list.some((n) => !n.read)) act(null, async () => { await call('POST', bizUrl('/notes/read')); list.forEach((n) => (n.read = true)); renderChrome(); });
}

/* ---------- Invoice ---------- */
let invOpen = null;
function showInvoice(memo) {
  const b = S.cur, s = b.sales.find((x) => x.id == memo); if (!s) return;
  invOpen = s.id;
  const cu = custOf(b, s), ph = custPhone(b, s);
  $('#modal').innerHTML = `<div class="modal" data-close><div class="box" role="dialog" aria-label="${L('ইনভয়েস', 'Invoice')}">
    <div class="inv-paper" id="invcap">
    <div class="inv-h"><div><h3>${esc(b.name)}</h3><div style="opacity:.9;font-size:.9rem">${esc(b.place)} · <span class="num">${esc(dg(fmtPhone(b.phone)))}</span></div><div style="opacity:.9;font-size:.85rem">${N(brand().seller)}</div></div>
      <div style="text-align:right"><b style="font-size:1.1rem">${L('ক্যাশ মেমো', 'Cash memo')}</b><div class="num">#${dg(s.id)}</div><div class="num" style="font-size:.85rem">${fmtLong(s.date)}</div></div></div>
    <div class="inv-b">
      <div class="two"><div><span class="muted">${L('ক্রেতা', 'Customer')}</span><br><b>${esc(custName(b, s))}</b>${cu ? `<br><span class="muted">${esc(cu.village)}</span>` : ''}${ph ? `<br><span class="muted num">${L('মোবাইল', 'Mobile')}: ${esc(dg(fmtPhone(ph)))}</span>` : ''}</div>
        <div style="text-align:right"><span class="muted">${L('বিক্রেতা', 'Sold by')}</span><br><b>${esc(sellerLabel(b, s.seller))}</b></div></div>
      <div class="tablewrap"><table><thead><tr><th>${L('পণ্য', 'Product')}</th><th class="r">${L('পরিমাণ', 'Qty')}</th><th class="r">${L('দর', 'Rate')}</th><th class="r">${L('মোট', 'Amount')}</th></tr></thead><tbody>
        ${s.items.map((it) => { const p = b.products.find((x) => x.id == it.pid); return `<tr><td>${esc(p?.name || '—')}${p?.meta ? `<div class="muted" style="font-size:.78rem">${esc(vspec(p))}</div>` : ''}${it.pcs ? ` <span class="muted">(${bn(it.pcs)} ${L('পিস', 'pcs')})</span>` : ''}</td><td class="r num">${bn(it.qty)} ${U(p?.unit)}</td><td class="r num">${tk(it.price)}</td><td class="r num">${tk(it.qty * it.price)}</td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="summary num"><div><span>${L('সর্বমোট', 'Grand total')}</span><span class="grand">${tk(s.total)}</span></div><div><span>${L('জমা', 'Paid')}</span><b>${tk(s.paid)}</b></div><div><span>${L('বাকি', 'Due')}</span><span class="due">${tk(s.total - s.paid)}</span></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="stamp ${s.total - s.paid > 0 ? '' : 'paid'}">${s.total - s.paid > 0 ? L('বাকি আছে', 'Balance due') : L('পরিশোধিত', 'Paid in full')}</span>
        <span class="muted" style="font-size:.8rem">${N(brand().note)}</span></div>
    </div></div>
    <div class="inv-actions">
      <div class="grp"><button class="btn sun" data-dl="pdf">${I('down')} ${L('PDF ডাউনলোড', 'Download PDF')}</button><button class="btn ghost" data-dl="png">${I('image')} ${L('ছবি (PNG)', 'Image (PNG)')}</button><button class="btn ghost" data-print>${I('file')} ${L('প্রিন্ট', 'Print')}</button><button class="btn ghost" data-switchlang>${I('lang')} ${LANG === 'bn' ? 'English' : 'বাংলা'}</button></div>
      <button class="btn" data-close>${I('check')} ${L('বন্ধ করুন', 'Close')}</button>
    </div></div></div>`;
}
function saveBlob(name, blob) {
  // Inside the Android app, hand the file to the app (blob downloads don't work in a WebView).
  if (window.KKAndroid) {
    const r = new FileReader();
    r.onload = () => window.KKAndroid.saveFile(name, String(r.result).split(',')[1], blob.type || 'application/octet-stream');
    r.readAsDataURL(blob); return;
  }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function downloadInvoice(kind, btn) {
  if (typeof html2canvas !== 'function' || (kind === 'pdf' && !window.jspdf)) return toast(L('ডাউনলোড টুল লোড হয়নি। পেজ রিফ্রেশ করুন।', 'The download tool did not load. Refresh the page.'), 'err');
  const node = $('#invcap'); if (!node) return;
  btn.disabled = true;
  try {
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
    const fname = `invoice-${S.cur.slug}-${invOpen}`;
    if (kind === 'png') saveBlob(fname + '.png', await new Promise((r) => canvas.toBlob(r, 'image/png')));
    else {
      const { jsPDF } = window.jspdf; const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw = 190, ph = (canvas.height * pw) / canvas.width, maxH = 277;
      const w = ph > maxH ? (pw * maxH) / ph : pw, h = Math.min(ph, maxH);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (210 - w) / 2, 10, w, h);
      saveBlob(fname + '.pdf', pdf.output('blob'));
    }
    toast(L('ডাউনলোড শুরু হয়েছে', 'Download started'));
  } catch (e) { console.error(e); toast(L('ফাইল তৈরি করা যায়নি, আবার চেষ্টা করুন', 'Couldn’t create the file — try again'), 'err'); }
  btn.disabled = false;
}
