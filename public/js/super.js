'use strict';
/* Mother panel (super admin): businesses, subscriptions, users, SMS log, settings, new-business wizard. */

const supBiz = (id) => S.sup.businesses.find((b) => b.id == id);
const P_ = () => S.sup.plans;
function matchBiz(b) {
  const q = (S.q || '').trim(); if (!q) return true;
  const qd = pk(q);
  const phones = [b.phone, b.admin.phone, ...b.sellers.map((s) => s.phone)].filter(Boolean);
  if (qd.length >= 3 && phones.some((p) => pk(p).includes(qd))) return true;
  return [b.name, b.owner, ...b.sellers.map((s) => s.name)].join(' ').toLowerCase().includes(q.toLowerCase());
}
const subIncomeMonth = () => { const m = todayStr().slice(0, 7); return S.sup.businesses.reduce((a, b) => a + b.sub.payments.filter((p) => p.date.slice(0, 7) === m).reduce((x, p) => x + p.amount, 0), 0); };

VIEWS.home = () => {
  const B = S.sup.businesses;
  const tot = B.reduce((a, b) => ({ s: a.s + b.stats.sales, r: a.r + b.stats.recv }), { s: 0, r: 0 });
  const colors = ['#2f8f3a', '#d98a00', '#2a8bbf', '#8a4fc1', '#c8414f'];
  const mName = new Date(todayStr() + 'T00:00:00Z').toLocaleDateString(LANG === 'bn' ? 'bn-BD' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const T = B.reduce((a, b) => ({ s: a.s + b.stats.month.sales, p: a.p + b.stats.month.profit, c: a.c + b.stats.month.count }), { s: 0, p: 0, c: 0 });
  return `
  <div class="pagehead"><div><h2>${L('সব ব্যবসা', 'All businesses')}</h2><p>${L('প্রতিটি ব্যবসায়ীর আলাদা অ্যাকাউন্ট সেটআপ ও নিয়ন্ত্রণ করুন।', 'Set up and control a separate account for each business owner.')}</p></div>
  <button class="btn sun" data-nav="wizard">${I('plus')} ${L('নতুন ব্যবসা সেটআপ', 'Set up new business')}</button></div>
  ${appCard('super')}
  <div class="grid g-kpi">
    ${kpi('k-leaf', 'build', L('মোট ব্যবসা', 'Businesses'), bn(B.length), L(`${bn(B.filter((b) => isLockedSub(b.sub)).length)} টি বন্ধ / মেয়াদ শেষ`, `${bn(B.filter((b) => isLockedSub(b.sub)).length)} locked`))}
    ${kpi('k-sky', 'cart', L('মোট বিক্রি (সব ব্যবসা)', 'Total sales (all)'), tk(tot.s))}
    ${kpi('k-berry', 'hand', L('মোট বাকি (পাওনা)', 'Total receivable'), tk(tot.r), L('কাস্টমারদের কাছে', 'Owed by customers'))}
    ${kpi('k-sun', 'crown', L('সাবস্ক্রিপশন আয় (এই মাস)', 'Subscription income (this month)'), tk(subIncomeMonth()))}
  </div>
  ${B.length ? '' : `<div class="card empty">${L('এখনো কোনো ব্যবসা নেই। "নতুন ব্যবসা সেটআপ" দিয়ে শুরু করুন।', 'No businesses yet. Start with “Set up new business”.')}</div>`}
  <div class="grid g3">
    ${B.map((b, i) => `
    <div class="card bizcard">
      <div class="top2"><div class="av" style="background:${colors[i % colors.length]}">${esc(b.name[0])}</div>
        <div style="min-width:0"><h3>${esc(b.name)}</h3><div class="muted" style="font-size:.88rem">${esc(b.owner)} · ${esc(b.place)}</div>
        <div class="muted num" style="font-size:.8rem">${esc(dg(fmtPhone(b.admin.phone)))}</div>
        <div style="font-size:.82rem;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><a href="${esc(shopUrl(b.slug))}" target="_blank" rel="noopener" class="num">${esc(shopUrl(b.slug).replace('https://', ''))}</a><button class="linkbtn muted" data-slugedit="${b.id}" aria-label="${L('ঠিকানা বদলান', 'Change address')}">${I('edit')}</button></div></div></div>
      <div class="meta">${b.cats.map(catPill).join('')}<span class="pill p-ok">${I('users')}${bn(b.sellers.length)} ${L('সেলার', 'sellers')}</span></div>
      <div class="summary num" style="font-size:.9rem">
        <div><span class="muted">${L('মোট বিক্রি', 'Total sales')}</span><b>${tk(b.stats.sales)}</b></div>
        <div><span class="muted">${L('এই মাস: বিক্রি / লাভ', 'This month: sales / profit')}</span><b>${tk(b.stats.month.sales)} / <span style="color:var(--leaf-d)">${tk(b.stats.month.profit)}</span></b></div>
        <div><span class="muted">${L('পাওনা বাকি', 'Receivable')}</span><b class="due">${tk(b.stats.recv)}</b></div>
        <div><span class="muted">${N(PLAN_N[b.sub.plan])} · ${L('মেয়াদ', 'until')}</span><b>${fmtLong(b.sub.expiry)}</b></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm" data-openbiz="${b.id}">${I('dash')} ${L('প্যানেল খুলুন', 'Open panel')}</button>${subPill(b.sub)}
        ${isLockedSub(b.sub) ? `<button class="btn sun sm" data-pay="${b.id}">${I('money')} ${L('পেমেন্ট নিন', 'Record payment')}</button>` : ''}</div>
    </div>`).join('')}
    <div class="card newbiz" data-nav="wizard" role="button" tabindex="0"><div class="plus">${I('plus')}</div><h3>${L('নতুন ব্যবসায়ী যোগ করুন', 'Add a new business')}</h3><span class="muted">${L('ধাপে ধাপে বাছাই করুন, বাকিটা অটো সেটআপ হবে', 'Choose step by step; the rest is set up automatically')}</span></div>
  </div>
  ${B.length ? `<div class="card"><div class="card-h"><h3>${I('trend')} ${L(`এই মাসের সারাংশ — ${mName}`, `This month — ${mName}`)}</h3><span class="muted" style="font-size:.85rem">${L('প্রতিটি মালিকের বিক্রি ও লাভ (খরচ বাদে)', 'Each owner’s sales and profit (after expenses)')}</span></div>
  <div class="tablewrap"><table><thead><tr><th>${L('ব্যবসা', 'Business')}</th><th>${L('মালিক', 'Owner')}</th><th>${L('মোবাইল', 'Mobile')}</th><th class="r">${L('মেমো', 'Memos')}</th><th class="r">${L('বিক্রি', 'Sales')}</th><th class="r">${L('লাভ', 'Profit')}</th><th>${L('সাবস্ক্রিপশন', 'Subscription')}</th></tr></thead><tbody>
  ${B.map((b) => `<tr><td><b>${esc(b.name)}</b></td><td>${esc(b.owner)}</td><td class="num muted" style="white-space:nowrap">${esc(dg(fmtPhone(b.admin.phone)))}</td><td class="r num">${bn(b.stats.month.count)}</td><td class="r num">${tk(b.stats.month.sales)}</td><td class="r num" style="color:${b.stats.month.profit < 0 ? 'var(--berry)' : 'var(--leaf-d)'}">${tk(b.stats.month.profit)}</td><td>${subPill(b.sub)}</td></tr>`).join('')}
  <tr class="totrow"><td colspan="3">${L('মোট', 'Total')}</td><td class="r num">${bn(T.c)}</td><td class="r num">${tk(T.s)}</td><td class="r num">${tk(T.p)}</td><td></td></tr></tbody></table></div></div>` : ''}`;
};

VIEWS.subs = () => {
  const P = P_(), B = S.sup.businesses;
  const active = B.filter((b) => !isLockedSub(b.sub)), soon = B.filter((b) => subStateOf(b.sub) === 'soon'), locked = B.filter((b) => isLockedSub(b.sub));
  const mrr = active.reduce((a, b) => a + (b.sub.plan === 'monthly' ? b.prices.monthly : b.sub.plan === 'yearly' ? b.prices.yearly / 12 : 0), 0);
  const total = B.reduce((a, b) => a + b.sub.payments.reduce((x, p) => x + p.amount, 0), 0);
  const pays = B.flatMap((b) => b.sub.payments.map((p) => ({ ...p, b }))).sort((x, y) => y.date.localeCompare(x.date));
  const rows = B.filter(matchBiz);
  return `<div class="pagehead"><div><h2>${L('সাবস্ক্রিপশন ও বিলিং', 'Subscriptions & billing')}</h2><p>${L('মেয়াদ শেষ হলে বা আপনি বন্ধ করলে অ্যাকাউন্ট লক হয়ে যায়। ডেটা মুছে যায় না।', 'When the term ends, or you deactivate it, the account locks. Data is kept.')}</p></div></div>
  <div class="grid g-kpi">
    ${kpi('k-leaf', 'check', L('সক্রিয় অ্যাকাউন্ট', 'Active accounts'), bn(active.length), L(`মোট ${bn(B.length)} টির মধ্যে`, `of ${bn(B.length)}`))}
    ${kpi('k-sun', 'alert', L('৭ দিনে মেয়াদ শেষ', 'Ending within 7 days'), bn(soon.length))}
    ${kpi('k-berry', 'x', L('বন্ধ / মেয়াদোত্তীর্ণ', 'Locked / expired'), bn(locked.length))}
    ${kpi('k-sky', 'money', L('এই মাসের আয়', 'Collected this month'), tk(subIncomeMonth()), L('মোট আদায় ', 'All-time ') + tk(total))}
    ${kpi('k-soil', 'trend', L('মাসিক গড় আয়', 'Monthly recurring'), tk(mrr))}
  </div>
  ${searchBar('q', S.q, L('মালিক বা সেলারের মোবাইল নম্বর দিয়ে খুঁজুন', 'Search by owner or seller mobile number'))}
  <div class="card"><div class="tablewrap"><table><thead><tr><th>${L('ব্যবসা', 'Business')}</th><th>${L('মোবাইল', 'Mobile')}</th><th>${L('প্ল্যান', 'Plan')}</th><th>${L('মেয়াদ শেষ', 'Expires')}</th><th>${L('অবস্থা', 'Status')}</th><th class="r">${L('কাজ', 'Actions')}</th></tr></thead><tbody>
  ${rows.length ? '' : `<tr><td colspan="6"><div class="empty">${L('কিছু পাওয়া যায়নি।', 'Nothing found.')}</div></td></tr>`}
  ${rows.map((b) => `<tr><td><b>${esc(b.name)}</b><div class="muted" style="font-size:.8rem">${esc(b.owner)}</div></td><td class="num muted" style="white-space:nowrap">${esc(dg(fmtPhone(b.admin.phone)))}</td><td>${N(PLAN_N[b.sub.plan])}${b.demo ? ` <span class="pill p-fert">${L('ডেমো', 'Demo')}</span>` : ''}<div class="muted num" style="font-size:.78rem">${tk(b.prices.monthly)}/${L('মাস', 'mo')} · ${tk(b.prices.yearly)}/${L('বছর', 'yr')}${b.prices.custom ? ` <b style="color:var(--soil)">${L('বিশেষ দাম', 'special')}</b>` : ''}</div></td><td class="num" style="white-space:nowrap">${fmtLong(b.sub.expiry)}</td><td>${subPill(b.sub)}</td>
    <td class="r"><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn sm" data-pay="${b.id}">${I('money')} ${L('পেমেন্ট নিন', 'Record payment')}</button>
    <button class="btn ghost sm" data-react="${b.id}">${I('check')} ${isLockedSub(b.sub) ? L('চালু করুন', 'Activate') : L('মেয়াদ বদলান', 'Change expiry')}</button>
    <button class="btn ghost sm" data-price="${b.id}">${I('tag')} ${L('দাম', 'Price')}</button>
    ${b.sub.status !== 'off' ? `<button class="btn red sm" data-deact="${b.id}">${I('x')} ${L('বন্ধ করুন', 'Deactivate')}</button>` : ''}</div></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card"><h3 style="margin-bottom:8px">${I('receipt')} ${L('সাম্প্রতিক পেমেন্ট', 'Recent payments')}</h3>
    ${pays.length ? `<div class="tablewrap"><table><thead><tr><th>${L('তারিখ', 'Date')}</th><th>${L('ব্যবসা', 'Business')}</th><th>${L('মাধ্যম', 'Method')}</th><th class="r">${L('টাকা', 'Amount')}</th></tr></thead><tbody>
    ${pays.slice(0, 15).map((p) => `<tr><td class="num" style="white-space:nowrap">${fmtDate(p.date)}</td><td>${esc(p.b.name)}<div class="muted" style="font-size:.78rem">${N(PLAN_N[p.plan])} × ${bn(p.qty)}</div></td><td>${N(METHOD[p.method])}${p.ref ? `<div class="muted num" style="font-size:.78rem">${esc(p.ref)}</div>` : ''}</td><td class="r num">${tk(p.amount)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${L('এখনো কোনো পেমেন্ট নেই।', 'No payments yet.')}</div>`}
  </div>`;
};

/* Payment modal */
let payFor = null;
function showPay(id) {
  const b = supBiz(id); if (!b) return; payFor = b.id;
  const plan = b.sub.plan === 'trial' ? 'monthly' : b.sub.plan;
  modal(`<h3>${L('সাবস্ক্রিপশন পেমেন্ট', 'Subscription payment')}</h3><div style="opacity:.9">${esc(b.name)} · ${esc(b.owner)}</div>`, `
    <div class="form-g">
      <label class="f">${L('প্ল্যান', 'Plan')}<select class="in" id="pay-plan"><option value="monthly" ${plan === 'monthly' ? 'selected' : ''}>${N(PLAN_N.monthly)} — ${tk(b.prices.monthly)}</option><option value="yearly" ${plan === 'yearly' ? 'selected' : ''}>${N(PLAN_N.yearly)} — ${tk(b.prices.yearly)}</option></select></label>
      <label class="f">${L('কত মাস / বছর', 'How many months / years')}<input class="in num" type="text" inputmode="decimal" data-amt id="pay-qty" value="1"></label>
      <label class="f">${L('মাধ্যম', 'Method')}<select class="in" id="pay-m">${Object.keys(METHOD).map((m) => `<option value="${m}">${N(METHOD[m])}</option>`).join('')}</select></label>
      <label class="f">${L('ট্রানজেকশন আইডি', 'Transaction ID')}<input class="in" id="pay-ref" maxlength="40" placeholder="${L('ঐচ্ছিক', 'Optional')}"></label>
      <label class="f">${L('নতুন মেয়াদ (ক্যালেন্ডার থেকে বদলাতে পারেন)', 'New expiry (pick on the calendar to change)')}<input class="in num" type="date" id="pay-date" min="${dayOff(-1)}"></label>
    </div>
    <div class="summary num" id="pay-sum"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn sun" data-savepay>${I('check')} ${L('পেমেন্ট সেভ ও মেয়াদ বাড়ান', 'Save payment & extend')}</button></div>`, { side: subPill(b.sub) });
  updPay();
}
function payCalc() {
  const b = supBiz(payFor), plan = $('#pay-plan').value, qty = Math.min(Math.max(Math.round(toNum($('#pay-qty').value)) || 1, 1), 12);
  const base = b.sub.expiry > todayStr() ? b.sub.expiry : todayStr();
  return { b, plan, qty, amount: (plan === 'yearly' ? b.prices.yearly : b.prices.monthly) * qty, newExp: addMonths(base, plan === 'yearly' ? 12 * qty : qty) };
}
function updPay() {
  if (!$('#pay-sum')) return; const c = payCalc(); const di = $('#pay-date');
  if (di && !di.dataset.touched) di.value = c.newExp;
  $('#pay-sum').innerHTML = `<div><span class="muted">${L('টাকা', 'Amount')}</span><span class="grand">${tk(c.amount)}</span></div>
    <div><span class="muted">${L('বর্তমান মেয়াদ', 'Current expiry')}</span><span>${fmtLong(c.b.sub.expiry)}</span></div>
    <div><b>${L('নতুন মেয়াদ', 'New expiry')}</b><b style="color:var(--leaf-d)">${fmtLong(di.value || c.newExp)}</b></div>`;
}
async function savePay(btn) {
  const c = payCalc(), exp = $('#pay-date').value || c.newExp;
  await act(btn, async () => {
    const r = await call('POST', `/api/super/businesses/${c.b.id}/payment`, { plan: c.plan, qty: c.qty, method: $('#pay-m').value, ref: $('#pay-ref').value, expiry: $('#pay-date').dataset.touched ? exp : undefined });
    closeModal(); await loadSuper(); render();
    toast(L(`${tk(r.amount)} পাওয়া গেছে · মেয়াদ ${fmtLong(r.expiry)} পর্যন্ত · মালিককে জানানো হয়েছে`, `${tk(r.amount)} received · active until ${fmtLong(r.expiry)} · owner notified`));
  });
}

/* Reactivate / change expiry with a calendar */
let reactFor = null;
function showReact(id) {
  const b = supBiz(id); if (!b) return; reactFor = b.id;
  const def = b.sub.expiry > todayStr() ? b.sub.expiry : addMonths(todayStr(), 1);
  modal(`<h3>${I('check')} ${isLockedSub(b.sub) ? L('অ্যাকাউন্ট চালু করুন', 'Activate account') : L('মেয়াদ বদলান', 'Change expiry')}</h3><div style="opacity:.9">${esc(b.name)} · <span class="num">${esc(dg(fmtPhone(b.admin.phone)))}</span></div>`, `
    <label class="f">${L('মেয়াদ শেষের তারিখ (ক্যালেন্ডার)', 'Expiry date (calendar)')}<input class="in num" type="date" id="re-date" min="${dayOff(-1)}" value="${def}"></label>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="muted" style="align-self:center;font-size:.85rem">${L('আজ থেকে:', 'From today:')}</span>${[[1, L('১ মাস', '1 month')], [3, L('৩ মাস', '3 months')], [6, L('৬ মাস', '6 months')], [12, L('১ বছর', '1 year')]].map(([m, t]) => `<button class="btn ghost sm" data-requick="${m}">+${t}</button>`).join('')}</div>
    <div class="summary num" id="re-sum"></div>
    <p class="muted" style="margin:0;font-size:.85rem">${L('টাকা নিলে "পেমেন্ট নিন" ব্যবহার করুন। এখানে শুধু তারিখ বদলায়।', 'If you took money, use “Record payment”. This only sets the date.')}</p>
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn sun" data-resave>${I('check')} ${L('সেভ ও চালু করুন', 'Save & activate')}</button></div>`, { side: subPill(b.sub), width: 520 });
  updReact();
}
function updReact() {
  const el = $('#re-sum'); if (!el) return; const d = $('#re-date').value;
  el.innerHTML = `<div><span class="muted">${L('নতুন মেয়াদ', 'New expiry')}</span><b style="color:var(--leaf-d)">${d ? fmtLong(d) : '—'}</b></div><div><span class="muted">${L('দিন বাকি থাকবে', 'Days remaining')}</span><b>${bn(Math.max(d ? daysTo(d) : 0, 0))}</b></div>`;
}
async function saveReact(btn) {
  const d = $('#re-date').value;
  if (!d || d <= todayStr()) return toast(L('আজকের পরের কোনো তারিখ বাছাই করুন', 'Pick a date after today'), 'err');
  await act(btn, async () => { await call('POST', `/api/super/businesses/${reactFor}/expiry`, { expiry: d }); closeModal(); await loadSuper(); render(); toast(L(`চালু হয়েছে · ${fmtLong(d)} পর্যন্ত · মালিককে জানানো হয়েছে`, `Active until ${fmtLong(d)} · owner notified`)); });
}
async function deactivate(id) {
  const b = supBiz(id);
  if (!(await ask(L(`<b>${esc(b.name)}</b> বন্ধ করবেন? মালিক ও সেলাররা আর ঢুকতে পারবে না। ডেটা থাকবে।`, `Deactivate <b>${esc(b.name)}</b>? The owner and sellers will be locked out. Data is kept.`), L('বন্ধ করুন', 'Deactivate'), true))) return;
  await act(null, async () => { await call('POST', `/api/super/businesses/${id}/deactivate`); await loadSuper(); render(); toast(L('বন্ধ করা হয়েছে · মালিককে SMS যাবে', 'Deactivated · owner will get an SMS')); });
}

/* ----- Users & passwords ----- */
after.users = () => { if (!S.users) act(null, async () => { S.users = await call('GET', '/api/super/users'); if (S.view === 'users') render(); }); };
VIEWS.users = () => {
  if (!S.users) return `<div class="card empty">${L('লোড হচ্ছে…', 'Loading…')}</div>`;
  const q = (S.q || '').trim(), qd = pk(q), ql = q.toLowerCase();
  const rows = S.users.filter((u) => !q || (qd.length >= 3 && pk(u.phone).includes(qd)) || (u.name + ' ' + (u.bname || '')).toLowerCase().includes(ql));
  const B = S.sup.businesses;
  return `<div class="pagehead"><div><h2>${L('ইউজার, আইডি ও পাসওয়ার্ড', 'Users, IDs & passwords')}</h2><p>${L('সব অ্যাডমিন ও সেলারের আইডি (মোবাইল নম্বর)। পাসওয়ার্ড দেখলে তা অডিট লগে লেখা থাকে।', 'Every admin and seller ID (mobile number). Viewing a password is written to the audit log.')}</p></div></div>
  ${searchBar('q', S.q, L('মোবাইল নম্বর বা নাম দিয়ে খুঁজুন', 'Search by mobile number or name'))}
  <div class="card"><div class="tablewrap"><table><thead><tr><th>${L('ব্যবসা', 'Business')}</th><th>${L('ভূমিকা', 'Role')}</th><th>${L('নাম', 'Name')}</th><th>${L('আইডি (মোবাইল)', 'ID (mobile)')}</th><th>${L('পাসওয়ার্ড', 'Password')}</th><th>${L('অবস্থা', 'Status')}</th><th class="r">${L('কাজ', 'Actions')}</th></tr></thead><tbody>
  ${rows.length ? rows.map((u) => { const b = u.business_id ? supBiz(u.business_id) : null; const pw = S.revealed[u.id];
    const label = u.role === 'super' ? L('সুপার অ্যাডমিন', 'Super admin') : u.role === 'admin' ? L('অ্যাডমিন', 'Admin') : L('সেলার ', 'Seller ') + (u.seller_code || '');
    return `<tr><td>${u.bname ? `<b>${esc(u.bname)}</b>` : '<span class="muted">—</span>'}</td><td><span class="pill ${u.role === 'super' ? 'p-fert' : u.role === 'admin' ? 'p-low' : 'p-ok'}">${label}</span></td><td>${esc(u.name)}</td>
    <td class="num" style="white-space:nowrap">${esc(dg(fmtPhone(u.phone)))}</td>
    <td style="white-space:nowrap"><span class="pass">${pw !== undefined ? esc(pw ?? '—') : '••••••'}</span> <button class="eyebtn" data-reveal="${u.id}" aria-label="${pw !== undefined ? L('লুকান', 'Hide') : L('পাসওয়ার্ড দেখুন', 'Show password')}">${I(pw !== undefined ? 'eyeoff' : 'eye')}</button></td>
    <td>${b ? subPill(b.sub) : '—'}</td>
    <td class="r"><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost sm" data-setpass="${u.id}">${L('পাসওয়ার্ড বদলান', 'Change password')}</button>${u.role === 'admin' ? `<button class="btn ghost sm" data-react="${u.business_id}">${I('check')} ${b && isLockedSub(b.sub) ? L('চালু করুন', 'Activate') : L('মেয়াদ', 'Expiry')}</button>` : ''}</div></td></tr>`; }).join('')
    : `<tr><td colspan="7"><div class="empty">${L('এই নম্বরে কাউকে পাওয়া যায়নি।', 'Nobody found with that number.')}</div></td></tr>`}
  </tbody></table></div></div>
  ${B.length ? `<div class="card" style="border-color:var(--berry)"><h3 style="color:var(--berry);margin-bottom:6px">${I('alert')} ${L('কোনো ব্যবসার সব ডেটা রিসেট', 'Reset all data for a business')}</h3>
    <p class="muted" style="margin:0 0 10px">${L('বিক্রি, ক্রয়, খরচ, কাস্টমার, বাকি ও স্টক মুছে যাবে। আইডি, পাসওয়ার্ড, পণ্যের তালিকা ও সাবস্ক্রিপশন থাকবে। OTP চালু থাকলে আপনার মোবাইলে OTP যাবে। রিসেটের আগের অবস্থার একটি ব্যাকআপ রাখা হয়।', 'Sales, purchases, expenses, customers, dues and stock are erased. IDs, passwords, product list and subscription stay. If OTP is on, an OTP goes to your mobile. One backup from before the reset is kept.')}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end"><label class="f" style="min-width:220px">${L('ব্যবসা', 'Business')}<select class="in" id="rs-biz">${B.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label><button class="btn red" data-resetbiz>${I('reset')} ${L('রিসেট করুন', 'Reset')}</button></div>
    ${B.filter((b) => b.hasBackup).map((b) => `<div class="summary" style="margin-top:10px"><div><span>${L(`${esc(b.name)} — রিসেটের আগের ব্যাকআপ আছে`, `${esc(b.name)} — backup from before the reset`)}</span><button class="btn ghost sm" data-restorebiz="${b.id}">${I('reset')} ${L('ফিরিয়ে আনুন', 'Restore')}</button></div></div>`).join('')}
  </div>` : ''}`;
};
async function reveal(id, btn) {
  if (S.revealed[id] !== undefined) { delete S.revealed[id]; return render(); }
  await act(btn, async () => { const r = await call('POST', `/api/super/users/${id}/reveal`); S.revealed[id] = r.password; render(); });
}
function passModal(title, sub, onSave, withCurrent) {
  modal(`<h3>${I('shield')} ${title}</h3><div style="opacity:.9">${sub}</div>`, `
    ${withCurrent ? `<label class="f">${L('বর্তমান পাসওয়ার্ড', 'Current password')}<input class="in" id="cp-0" type="password" autocomplete="current-password"></label>` : ''}
    <label class="f">${L('নতুন পাসওয়ার্ড', 'New password')}<input class="in" id="cp-1" type="password" autocomplete="new-password"></label>
    <div data-rulesfor="cp-1">${rulesHTML('')}</div>
    <label class="f">${L('আবার লিখুন', 'Type it again')}<input class="in" id="cp-2" type="password" autocomplete="new-password"></label>
    ${S.otp ? `<p class="muted" style="margin:0;font-size:.85rem">${L('সেভ করার আগে OTP যাচাই হবে।', 'An OTP check happens before saving.')}</p>` : ''}
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" id="cp-save">${I('check')} ${L('সেভ করুন', 'Save')}</button></div>`, { width: 480 });
  $('#cp-save').onclick = async (e) => {
    const p1 = $('#cp-1').value, p2 = $('#cp-2').value;
    if (!passOk(p1)) return toast(passMsg(), 'err');
    if (p1 !== p2) return toast(L('দুটি পাসওয়ার্ড মেলেনি', 'The two passwords don’t match'), 'err');
    await act(e.currentTarget, async () => { await onSave(p1, withCurrent ? $('#cp-0').value : undefined); closeModal(); toast(L('পাসওয়ার্ড বদলানো হয়েছে', 'Password changed')); });
  };
}
function setPassFor(id) {
  const u = S.users.find((x) => x.id == id);
  passModal(L('নতুন পাসওয়ার্ড', 'New password'), `${esc(u.name)} · <span class="num">${esc(dg(fmtPhone(u.phone)))}</span>`, async (pw) => {
    await call('POST', `/api/super/users/${id}/password`, { password: pw });
    delete S.revealed[id]; render();
  });
}
async function resetBiz(btn) {
  const b = supBiz($('#rs-biz').value);
  if (!(await ask(L(`<b>${esc(b.name)}</b>-এর সব বিক্রি, ক্রয়, খরচ, কাস্টমার, বাকি ও স্টক মুছে যাবে। নিশ্চিত?`, `All sales, purchases, expenses, customers, dues and stock of <b>${esc(b.name)}</b> will be erased. Sure?`), L('রিসেট করুন', 'Reset'), true))) return;
  await act(btn, async () => { await call('POST', `/api/super/businesses/${b.id}/reset`); await loadSuper(); render(); toast(L('ডেটা রিসেট হয়েছে · ব্যাকআপ রাখা আছে', 'Data reset · a backup is kept')); });
}
async function restoreBiz(id, btn) {
  if (!(await ask(L('রিসেটের আগের ডেটা ফিরিয়ে আনবেন? রিসেটের পরে যা এন্ট্রি হয়েছে তা মুছে যাবে।', 'Restore the data from before the reset? Anything entered after the reset will be removed.'), L('ফিরিয়ে আনুন', 'Restore')))) return;
  await act(btn, async () => { await call('POST', `/api/super/businesses/${id}/restore`); await loadSuper(); render(); toast(L('ডেটা ফিরিয়ে আনা হয়েছে', 'Data restored')); });
}

/* ----- SMS log ----- */
after.sms = () => { if (!S.sms) act(null, async () => { S.sms = await call('GET', '/api/super/sms'); if (S.view === 'sms') render(); }); };
VIEWS.sms = () => {
  const gw = S.sup.gateway, ago = gw.lastSeen ? Math.round((Date.now() - gw.lastSeen) / 60000) : null;
  const online = ago !== null && ago < 3;
  const st = { pending: ['p-low', L('অপেক্ষায়', 'Waiting')], sending: ['p-low', L('পাঠানো হচ্ছে', 'Sending')], sent: ['p-ok', L('পাঠানো', 'Sent')], failed: ['p-out', L('ব্যর্থ', 'Failed')], expired: ['p-out', L('বাতিল', 'Dropped')] };
  return `<div class="pagehead"><div><h2>${L('SMS ও OTP লগ', 'SMS & OTP log')}</h2><p>${L('ESP32 + SIM মডিউল দিয়ে যে SMS যায় তার তালিকা। OTP কোড লগে লুকানো থাকে।', 'Messages sent through the ESP32 + SIM module. OTP codes are hidden here.')}</p></div>
  <button class="btn ghost" data-smsrefresh>${I('reset')} ${L('রিফ্রেশ', 'Refresh')}</button></div>
  <div class="card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="pill ${online ? 'p-ok' : 'p-out'}">● ${online ? L('গেটওয়ে অনলাইন', 'Gateway online') : L('গেটওয়ে অফলাইন', 'Gateway offline')}</span>
    <span class="muted">${ago === null ? L('ESP32 এখনো সংযুক্ত হয়নি', 'The ESP32 has never connected') : L(`শেষ যোগাযোগ ${bn(ago)} মিনিট আগে`, `Last contact ${ago} min ago`)} · ${L(`অপেক্ষায় ${bn(gw.pending)} টি SMS`, `${gw.pending} SMS waiting`)}</span></div>
  <div class="card">${!S.sms ? L('লোড হচ্ছে…', 'Loading…') : S.sms.length ? `<div class="tablewrap"><table><thead><tr><th>${L('সময়', 'Time')}</th><th>${L('কাকে', 'To')}</th><th>${L('মেসেজ', 'Message')}</th><th>${L('অবস্থা', 'Status')}</th></tr></thead><tbody>
    ${S.sms.map((m) => `<tr><td class="num" style="white-space:nowrap">${new Date(m.created_at).toLocaleString(LANG === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td class="num" style="white-space:nowrap">${esc(dg(fmtPhone(m.phone)))}</td><td style="min-width:240px">${esc(m.text)}</td><td><span class="pill ${(st[m.status] || st.pending)[0]}">${(st[m.status] || st.pending)[1]}</span></td></tr>`).join('')}
  </tbody></table></div>` : `<div class="empty">${L('এখনো কোনো SMS নেই।', 'No SMS yet.')}</div>`}</div>`;
};

/* ----- Settings: OTP switch, plans, gateway test, own password ----- */
VIEWS.settings = () => {
  const P = P_(), gw = S.sup.gateway, online = gw.lastSeen && Date.now() - gw.lastSeen < 180000;
  return `<div class="pagehead"><div><h2>${L('সেটিংস ও OTP', 'Settings & OTP')}</h2><p>${L('পুরো সিস্টেমের OTP চালু/বন্ধ, প্ল্যানের দাম ও আপনার অ্যাকাউন্ট।', 'System-wide OTP switch, plan prices and your account.')}</p></div></div>
  <div class="card" style="border-color:${S.otp ? 'var(--leaf)' : 'var(--line)'}">
    <div class="card-h"><h3>${I('shield')} ${L('OTP যাচাই', 'OTP verification')}</h3><span class="pill ${S.otp ? 'p-ok' : 'p-out'}">● ${S.otp ? L('চালু', 'On') : L('বন্ধ', 'Off')}</span></div>
    <p class="muted" style="margin:0 0 10px">${L('চালু থাকলে নতুন আইডি তৈরি, পাসওয়ার্ড বদলানো, পাসওয়ার্ড ভুলে গেলে ও ডেটা রিসেটে SMS-এ OTP লাগবে। বন্ধ থাকলে এসব OTP ছাড়াই হবে, আর "পাসওয়ার্ড ভুলে গেছেন" বন্ধ থাকবে (তখন আপনি বা মালিক পাসওয়ার্ড বদলে দেবেন)।', 'When on, new IDs, password changes, forgotten passwords and data resets need an SMS OTP. When off, they work without OTP and “Forgot password” is disabled (you or the owner reset passwords instead).')}</p>
    ${!online && !S.otp ? `<p style="margin:0 0 10px;color:var(--soil);font-weight:600">${I('alert')} ${L('SMS গেটওয়ে (ESP32) এখন অনলাইন নেই। গেটওয়ে চালু না করে OTP চালু করলে কেউ কোড পাবে না।', 'The SMS gateway (ESP32) is not online. If you switch OTP on before it works, nobody will receive codes.')}</p>` : ''}
    <button class="btn ${S.otp ? 'red' : ''}" data-otptoggle>${S.otp ? `${I('x')} ${L('OTP বন্ধ করুন', 'Switch OTP off')}` : `${I('check')} ${L('OTP চালু করুন', 'Switch OTP on')}`}</button>
  </div>
  <div class="grid g2">
    <div class="card"><h3 style="margin-bottom:10px">${I('tag')} ${L('প্ল্যান ও দাম', 'Plans & prices')}</h3>
      <div class="form-g">
        <label class="f">${L('মাসিক (৳)', 'Monthly (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="pl-m" value="${P.monthly}"></label>
        <label class="f">${L('বার্ষিক (৳)', 'Yearly (৳)')}<input class="in num" type="text" inputmode="decimal" data-amt id="pl-y" value="${P.yearly}"></label>
        <label class="f">${L('ফ্রি ট্রায়াল (দিন)', 'Free trial (days)')}<input class="in num" type="text" inputmode="decimal" data-amt id="pl-t" value="${P.trialDays}"></label>
        <label class="f">${L('টাকা পাঠানোর নম্বর (বিকাশ/নগদ)', 'Payment number (bKash/Nagad)')}<input class="in num" id="pl-to" value="${esc(P.payTo)}"></label>
        <label class="f">${L('WhatsApp নম্বর (অ্যাপ পেজের বোতাম)', 'WhatsApp number (app page buttons)')}<input class="in num" id="pl-wa" type="tel" value="${esc(P.whatsapp || P.payTo)}" placeholder="01XXXXXXXXX"></label>
      </div>
      <div style="margin-top:12px"><button class="btn" data-saveplans>${I('check')} ${L('সেভ করুন', 'Save')}</button></div></div>
    <div class="card"><h3 style="margin-bottom:10px">${I('phone')} ${L('SMS গেটওয়ে পরীক্ষা', 'Test the SMS gateway')}</h3>
      <p class="muted" style="margin:0 0 10px">${online ? L('গেটওয়ে অনলাইন আছে।', 'The gateway is online.') : L('গেটওয়ে অফলাইন। ESP32 চালু ও WiFi-তে আছে কিনা দেখুন।', 'The gateway is offline. Check the ESP32 is powered and on WiFi.')}</p>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap"><label class="f" style="flex:1;min-width:160px">${L('যে নম্বরে পাঠাবেন', 'Send to')}<input class="in num" id="sms-to" type="tel" value="${esc(S.sup.superAcc.phone)}"></label><button class="btn ghost" data-smstest>${I('phone')} ${L('টেস্ট SMS', 'Test SMS')}</button></div></div>
  </div>
  <div class="card"><h3 style="margin-bottom:10px">${I('user')} ${L('আপনার অ্যাকাউন্ট', 'Your account')}</h3>
    <div class="summary num" style="max-width:520px"><div><span class="muted">${L('আইডি (মোবাইল)', 'ID (mobile)')}</span><b>${esc(dg(fmtPhone(S.me.phone)))}</b></div></div>
    <button class="btn ghost" style="margin-top:10px" data-ownpass>${I('shield')} ${L('আমার পাসওয়ার্ড বদলান', 'Change my password')}</button></div>`;
};

/* ----- New business wizard ----- */
function newWiz() { return { step: 0, slug: '', name: '', owner: '', phone: '', place: '', licence: '', opening: '', cats: [...TYPE_CATS[btype()]], modules: MODULES.map((m) => m.k), starter: true, sellers: [{ name: '', phone: '', pass: '' }], adminUser: '', adminPass: '', plan: 'trial', payMethod: 'bkash', payRef: '' }; }
VIEWS.wizard = () => {
  if (!S.wiz) S.wiz = newWiz();
  const w = S.wiz;
  const STEPS = [L('ব্যবসার তথ্য', 'Business info'), L('পণ্যের ধরন', 'Product types'), L('মডিউল বাছাই', 'Modules'), L('অ্যাডমিন ও সেলার', 'Admin & sellers'), L('প্ল্যান', 'Plan'), L('সেটআপ', 'Set up')];
  let body = '';
  if (w.step === 0) body = `
    <h3>${I('build')} ${L('ব্যবসার তথ্য', 'Business info')}</h3><p class="muted">${L('এই তথ্য ইনভয়েস ও কাস্টমার ওয়েবসাইটে দেখাবে।', 'This appears on invoices and on the customer website.')}</p>
    <div class="form-g">
      <label class="f">${L('ব্যবসার নাম', 'Business name')}<input class="in" id="w-name" maxlength="80" value="${esc(w.name)}"></label>
      <label class="f">${L('মালিকের নাম', 'Owner name')}<input class="in" id="w-owner" maxlength="60" value="${esc(w.owner)}"></label>
      <label class="f">${L('দোকানের ওয়েব ঠিকানা (ইংরেজি ছোট অক্ষর)', 'Shop web address (small English letters)')}<span style="display:flex;align-items:center;gap:6px"><input class="in" id="w-slug" maxlength="30" value="${esc(w.slug)}" placeholder="karim" autocapitalize="off" spellcheck="false" style="text-transform:lowercase"><b class="muted" style="white-space:nowrap">.${esc(S.site?.domain || 'example.com')}</b></span></label>
      <label class="f">${L('দোকানের মোবাইল নম্বর', 'Shop mobile number')}<input class="in num" id="w-phone" type="tel" value="${esc(w.phone)}" placeholder="01XXXXXXXXX"></label>
      <label class="f">${L('ঠিকানা / উপজেলা', 'Address / upazila')}<input class="in" id="w-place" maxlength="80" value="${esc(w.place)}"></label>
      <label class="f">${L('শুরুর নগদ ব্যালেন্স (৳)', 'Opening cash balance (৳)')}<input class="in num" id="w-open" type="text" inputmode="decimal" data-amt value="${esc(w.opening)}" placeholder="0"></label>
      <label class="f">${L('ডিলার লাইসেন্স নং (ঐচ্ছিক)', 'Dealer licence no. (optional)')}<input class="in" id="w-lic" maxlength="40" value="${esc(w.licence)}"></label>
    </div>`;
  if (w.step === 1) body = `
    <h3>${I('leaf')} ${L('এই দোকান কী কী বিক্রি করে?', 'What does this shop sell?')}</h3>
    <div class="tiles">${Object.entries(CAT).filter(([k]) => TYPE_CATS[btype()].includes(k)).map(([k, c]) => `
      <label class="tile ${w.cats.includes(k) ? 'sel' : ''}"><input type="checkbox" data-wcat="${k}" ${w.cats.includes(k) ? 'checked' : ''}><span class="chk">${I('check')}</span>
        <span class="big" style="background:${c.bg};color:${c.color}">${I(c.icon)}</span><b>${CN(k)}</b><small>${N(c.d)}</small></label>`).join('')}
    </div>
    <label class="mod ${w.starter ? 'sel' : ''}" style="margin-top:14px"><span class="ic">${I('tag')}</span><span>${L('সাধারণ পণ্যের তালিকা যোগ করুন', 'Add a starter product list')}<small>${L('স্টক ০ থাকবে; দাম পরে বদলানো যাবে', 'Stock starts at 0; prices can be edited')}</small></span><input type="checkbox" data-wstarter ${w.starter ? 'checked' : ''}></label>`;
  if (w.step === 2) body = `
    <h3>${I('dash')} ${L('কোন কোন সুবিধা চালু থাকবে?', 'Which features should be on?')}</h3>
    <div class="mods">${MODULES.map((m) => `<label class="mod ${w.modules.includes(m.k) ? 'sel' : ''}"><span class="ic">${I(m.icon)}</span><span>${N(m.t)}<small>${m.lock ? L('আবশ্যক', 'Required') : L('ঐচ্ছিক', 'Optional')}</small></span>
      <input type="checkbox" data-wmod="${m.k}" ${w.modules.includes(m.k) ? 'checked' : ''} ${m.lock ? 'disabled' : ''}></label>`).join('')}</div>`;
  if (w.step === 3) body = `
    <h3>${I('users')} ${L('অ্যাডমিন ও সেলার আইডি', 'Admin & seller IDs')}</h3><p class="muted">${L('প্রত্যেকের মোবাইল নম্বরই লগইন আইডি। সবার আলাদা পাসওয়ার্ড। সেলার ০ থেকে ৩ জন।', 'Each person’s mobile number is their login ID, with their own password. 0 to 3 sellers.')}</p>
    <div class="form-g" style="margin-bottom:6px">
      <label class="f">${L('অ্যাডমিনের মোবাইল (এটাই আইডি)', 'Admin mobile (login ID)')}<input class="in num" id="w-admin" type="tel" value="${esc(w.adminUser || w.phone)}" placeholder="01XXXXXXXXX"></label>
      <label class="f">${L('অ্যাডমিন পাসওয়ার্ড', 'Admin password')}<input class="in" id="w-apass" type="text" autocomplete="new-password" value="${esc(w.adminPass)}"></label>
    </div>
    <div style="margin-bottom:14px" data-rulesfor="w-apass">${rulesHTML(w.adminPass)}</div>
    <div style="display:flex;flex-direction:column;gap:10px">${w.sellers.map((s, i) => `
      <div class="sellerrow v2">
        <label class="f">${L('কোড', 'Code')}<input class="in" value="S-0${i + 1}" disabled></label>
        <label class="f">${L('সেলারের নাম', 'Seller name')}<input class="in" data-sname="${i}" maxlength="60" value="${esc(s.name)}"></label>
        <label class="f">${L('মোবাইল (আইডি)', 'Mobile (ID)')}<input class="in num" type="tel" data-sphone="${i}" value="${esc(s.phone)}" placeholder="01XXXXXXXXX"></label>
        <label class="f">${L('পাসওয়ার্ড', 'Password')}<input class="in" type="text" autocomplete="new-password" id="sp-${i}" data-spass="${i}" value="${esc(s.pass)}"></label>
        <button class="iconbtn" data-sdel="${i}" aria-label="${L('সেলার বাদ দিন', 'Remove seller')}">${I('x')}</button>
        <div style="grid-column:1/-1" data-rulesfor="sp-${i}">${rulesHTML(s.pass)}</div>
      </div>`).join('')}</div>
    <div style="margin-top:10px">${w.sellers.length < 3 ? `<button class="btn ghost sm" data-sadd>${I('plus')} ${L('সেলার যোগ করুন', 'Add seller')} (${bn(w.sellers.length)}/${bn(3)})</button>` : `<span class="pill p-low">${L('সর্বোচ্চ ৩ জন সেলার', 'Maximum of 3 sellers')}</span>`}</div>`;
  if (w.step === 4) {
    const P = P_();
    const opts = [['trial', L(`${bn(P.trialDays)} দিন ফ্রি`, `${bn(P.trialDays)} days free`)], ['monthly', tk(P.monthly) + L(' / মাস', ' / month')], ['yearly', tk(P.yearly) + L(' / বছর', ' / year')]];
    body = `<h3>${I('crown')} ${L('সাবস্ক্রিপশন প্ল্যান', 'Subscription plan')}</h3>
    <div class="tiles">${opts.map(([k, price]) => `<label class="tile ${w.plan === k ? 'sel' : ''}"><input type="radio" name="wplan" data-wplan="${k}" ${w.plan === k ? 'checked' : ''}><span class="chk">${I('check')}</span>
      <span class="big" style="background:var(--sun-l);color:var(--soil)">${I(k === 'trial' ? 'leaf' : 'crown')}</span><b>${N(PLAN_N[k])}</b><span class="num" style="font-family:var(--display);font-size:1.3rem;font-weight:800;color:var(--leaf-d)">${price}</span></label>`).join('')}</div>
    <div class="form-g" style="margin-top:14px" ${w.plan === 'trial' ? 'hidden' : ''} id="w-paybox">
      <label class="f">${L('পেমেন্ট মাধ্যম', 'Payment method')}<select class="in" id="w-pm">${Object.keys(METHOD).map((m) => `<option value="${m}" ${w.payMethod === m ? 'selected' : ''}>${N(METHOD[m])}</option>`).join('')}</select></label>
      <label class="f">${L('ট্রানজেকশন আইডি', 'Transaction ID')}<input class="in" id="w-pref" maxlength="40" value="${esc(w.payRef)}"></label>
    </div>`;
  }
  if (w.step === 5) body = `
    <h3>${I('check')} ${L('সব ঠিক আছে? সেটআপ শুরু করুন', 'All set? Start the setup')}</h3>
    <div class="grid g2" style="margin-top:12px">
      <div class="summary">
        <div><span class="muted">${L('ব্যবসা', 'Business')}</span><b>${esc(w.name)}</b></div>
        <div><span class="muted">${L('ওয়েব ঠিকানা', 'Web address')}</span><b>${esc(w.slug)}.${esc(S.site?.domain || '')}</b></div>
        <div><span class="muted">${L('মালিক', 'Owner')}</span><b>${esc(w.owner)}</b></div>
        <div><span class="muted">${L('অ্যাডমিন আইডি', 'Admin ID')}</span><b class="num">${esc(dg(fmtPhone(w.adminUser)))}</b></div>
        <div><span class="muted">${L('পণ্যের ধরন', 'Product types')}</span><span>${w.cats.map(catPill).join(' ')}</span></div>
        <div><span class="muted">${L('সেলার', 'Sellers')}</span><b>${bn(w.sellers.length)}</b></div>
        <div><span class="muted">${L('প্ল্যান', 'Plan')}</span><b>${N(PLAN_N[w.plan])}</b></div>
      </div>
      <div class="summary"><div><b>${L('চালু মডিউল', 'Modules on')}</b><span class="muted">${bn(w.modules.length)}</span></div>
        <div style="flex-wrap:wrap;justify-content:flex-start">${w.modules.map((k) => `<span class="pill p-ok">${N(MODULES.find((m) => m.k === k).t)}</span>`).join('')}</div></div>
    </div>
    ${S.otp ? `<p class="muted" style="margin:10px 0 0">${L('সেটআপের আগে অ্যাডমিনের মোবাইলে OTP যাবে।', 'An OTP goes to the admin’s mobile before setup.')}</p>` : ''}
    <div id="setupbox"></div>`;
  return `
  <div class="pagehead"><div><h2>${L('নতুন ব্যবসা সেটআপ', 'New business setup')}</h2><p>${L('একবার বাছাই করুন — কৃষিখাতা নিজেই অ্যাকাউন্ট, ক্যাটাগরি, আইডি ও হিসাবের খাতা তৈরি করবে।', 'Choose once — KrishiKhata creates the account, categories, IDs and ledgers.')}</p></div></div>
  <div class="steps">${STEPS.map((t, i) => `<span class="step ${i === w.step ? 'on' : i < w.step ? 'done' : ''}"><span class="n">${i < w.step ? '✓' : bn(i + 1)}</span>${t}</span>`).join('')}</div>
  <div class="card">${body}
    <div class="wiz-foot">
      <button class="btn ghost" data-wback ${w.step === 0 ? 'disabled style="visibility:hidden"' : ''}>← ${L('পেছনে', 'Back')}</button>
      ${w.step < 5 ? `<button class="btn" data-wnext>${L('পরের ধাপ', 'Next')} →</button>` : `<button class="btn sun" data-wrun>${I('leaf')} ${L('সেটআপ শুরু করুন', 'Start setup')}</button>`}
    </div>
  </div>`;
};
function saveWizInputs() {
  const w = S.wiz; if (!w) return;
  const v = (id) => document.getElementById(id)?.value;
  if (w.step === 0) { w.slug = (v('w-slug') ?? w.slug).trim().toLowerCase(); w.name = v('w-name') ?? w.name; w.owner = v('w-owner') ?? w.owner; w.phone = v('w-phone') ?? w.phone; w.place = v('w-place') ?? w.place; w.opening = v('w-open') ?? w.opening; w.licence = v('w-lic') ?? w.licence; }
  if (w.step === 3) {
    w.adminUser = v('w-admin') ?? w.adminUser; w.adminPass = v('w-apass') ?? w.adminPass;
    document.querySelectorAll('[data-sname]').forEach((e) => (w.sellers[+e.dataset.sname].name = e.value));
    document.querySelectorAll('[data-sphone]').forEach((e) => (w.sellers[+e.dataset.sphone].phone = e.value));
    document.querySelectorAll('[data-spass]').forEach((e) => (w.sellers[+e.dataset.spass].pass = e.value));
  }
  if (w.step === 4) { w.payMethod = v('w-pm') ?? w.payMethod; w.payRef = v('w-pref') ?? w.payRef; }
}
function wizCheck(w) {
  if (w.step === 0) { if (!w.name.trim() || !w.owner.trim()) return L('ব্যবসা ও মালিকের নাম লিখুন', 'Enter the business and owner names'); if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(w.slug)) return L('ওয়েব ঠিকানায় শুধু ইংরেজি ছোট অক্ষর, সংখ্যা ও - দিন (৩–৩০ অক্ষর), যেমন karim', 'Web address: small English letters, numbers and - only (3–30), e.g. karim'); if (w.phone && !validPhone(w.phone)) return L('সঠিক মোবাইল নম্বর দিন', 'Enter a valid mobile number'); }
  if (w.step === 1 && !w.cats.length) return L('অন্তত একটি পণ্যের ধরন বাছাই করুন', 'Pick at least one product type');
  if (w.step === 3) {
    if (!validPhone(w.adminUser)) return L('অ্যাডমিনের সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন', 'Enter a valid 11-digit admin mobile number');
    if (!passOk(w.adminPass)) return L('অ্যাডমিন: ', 'Admin: ') + passMsg();
    const seen = [pk(w.adminUser)];
    for (const [i, s] of w.sellers.entries()) {
      const t = L(`সেলার ${bn(i + 1)}: `, `Seller ${i + 1}: `);
      if (!s.name.trim()) return t + L('নাম লিখুন', 'enter a name');
      if (!validPhone(s.phone)) return t + L('সঠিক মোবাইল নম্বর দিন', 'enter a valid mobile number');
      if (seen.includes(pk(s.phone))) return t + L('এই নম্বর আগেই ব্যবহার হয়েছে', 'this number is already used');
      seen.push(pk(s.phone));
      if (!passOk(s.pass)) return t + passMsg();
    }
  }
  return '';
}
async function runSetup(btn) {
  const w = S.wiz;
  await act(btn, async () => {
    const r = await call('POST', '/api/super/businesses', {
      slug: w.slug, name: w.name, owner: w.owner, phone: w.phone ? pk(w.phone) : '', place: w.place, licence: w.licence, opening: toNum(w.opening), cats: w.cats, modules: w.modules, starter: w.starter,
      admin: { phone: pk(w.adminUser), password: w.adminPass }, sellers: w.sellers.map((s) => ({ name: s.name, phone: pk(s.phone), password: s.pass })),
      plan: w.plan, payMethod: w.payMethod, payRef: w.payRef,
    });
    const tasks = [L(`“${w.name}” এর অ্যাকাউন্ট তৈরি`, `Account for “${w.name}” created`), L('পণ্যের ক্যাটাগরি: ', 'Product categories: ') + w.cats.map(CN).join(', '),
      L('অ্যাডমিন আইডি: ', 'Admin ID: ') + dg(fmtPhone(w.adminUser)), w.sellers.length ? L('সেলার আইডি: ', 'Seller IDs: ') + w.sellers.map((s) => dg(fmtPhone(s.phone))).join(', ') : L('সেলার নেই', 'No sellers'),
      L('ইনভয়েস নম্বর #১০০১ থেকে শুরু', 'Invoice numbers start at #1001'), L('সাবস্ক্রিপশন: ', 'Subscription: ') + N(PLAN_N[w.plan])];
    $('#setupbox').innerHTML = `<div class="progress"><i id="pbar"></i></div><div class="setup-log" id="slog"></div>`;
    for (let i = 0; i < tasks.length; i++) { $('#slog').insertAdjacentHTML('beforeend', `<div><span class="dot">${I('check')}</span>${esc(tasks[i])}</div>`); $('#pbar').style.width = ((i + 1) / tasks.length) * 100 + '%'; await new Promise((ok) => setTimeout(ok, 220)); }
    S.wiz = null; await loadSuper();
    toast(L('সেটআপ সম্পন্ন! ঠিকানা: ', 'Setup complete! Address: ') + r.url);
    openBiz(r.id, true);
  });
}
// Opening a shop panel asks for the super admin password again (skip = right after creating that shop).
function openBiz(id, skipPassword) {
  const enter = async () => { S.bid = Number(id); S.dq = ''; S.sq = ''; draft = null; await loadBiz(); go('dash'); };
  if (skipPassword) return act(null, enter);
  const b = supBiz(id);
  modal(`<h3>${I('shield')} ${L('পাসওয়ার্ড দিন', 'Enter your password')}</h3><div style="opacity:.9">${esc(b ? b.name : '')} — ${L('দোকানের প্যানেল খুলতে', 'to open the shop panel')}</div>`, `
    <form id="unlock-form" style="display:flex;flex-direction:column;gap:12px">
      <label class="f">${L('আপনার (সুপার অ্যাডমিন) পাসওয়ার্ড', 'Your (super admin) password')}<input class="in" id="ul-pass" type="password" autocomplete="current-password" required></label>
      <div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" type="submit">${I('check')} ${L('খুলুন', 'Open')}</button></div>
    </form>`, { width: 440 });
  $('#unlock-form').onsubmit = (e) => { e.preventDefault(); act(e.submitter || $('#unlock-form button[type=submit]'), async () => { await call('POST', '/api/super/unlock-shop', { bid: Number(id), password: $('#ul-pass').value }); closeModal(); await enter(); }); };
}

/* Change a shop's web address */
function editSlug(id) {
  const b = supBiz(id);
  modal(`<h3>${I('globe')} ${L('দোকানের ওয়েব ঠিকানা', 'Shop web address')}</h3><div style="opacity:.9">${esc(b.name)}</div>`, `
    <label class="f">${L('নতুন ঠিকানা', 'New address')}<span style="display:flex;align-items:center;gap:6px"><input class="in" id="sl-in" maxlength="30" value="${esc(b.slug)}" autocapitalize="off" spellcheck="false"><b class="muted">.${esc(S.site?.domain || '')}</b></span></label>
    <p class="muted" style="margin:0;font-size:.85rem">${L('ঠিকানা বদলালে পুরোনো ঠিকানা আর কাজ করবে না। মালিককে নতুন ঠিকানা জানানো হবে।', 'The old address stops working. The owner is told the new address.')}</p>
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" id="sl-save">${I('check')} ${L('সেভ করুন', 'Save')}</button></div>`, { width: 480 });
  $('#sl-save').onclick = (e) => act(e.currentTarget, async () => { const r = await call('PUT', `/api/super/businesses/${id}/slug`, { slug: $('#sl-in').value.trim().toLowerCase() }); closeModal(); await loadSuper(); render(); toast(L('নতুন ঠিকানা: ', 'New address: ') + r.url); });
}

/* Special subscription price for one shop */
function editPrice(id) {
  const b = supBiz(id), P = P_();
  modal(`<h3>${I('tag')} ${L('এই দোকানের দাম', 'Price for this shop')}</h3><div style="opacity:.9">${esc(b.name)}</div>`, `
    <p class="muted" style="margin:0">${L(`খালি রাখলে সাধারণ দাম: মাসিক ${tk(P.monthly)}, বার্ষিক ${tk(P.yearly)}`, `Leave empty for the standard price: ${tk(P.monthly)} monthly, ${tk(P.yearly)} yearly`)}</p>
    <div class="form-g">
      <label class="f">${L('মাসিক (৳)', 'Monthly (৳)')}<input class="in num" id="pr-m" type="text" inputmode="decimal" data-amt value="${b.prices.custom ? b.prices.monthly : ''}" placeholder="${P.monthly}"></label>
      <label class="f">${L('বার্ষিক (৳)', 'Yearly (৳)')}<input class="in num" id="pr-y" type="text" inputmode="decimal" data-amt value="${b.prices.custom ? b.prices.yearly : ''}" placeholder="${P.yearly}"></label>
    </div>
    <p class="muted" style="margin:0;font-size:.85rem">${L('নতুন দাম পরের পেমেন্ট থেকে লাগবে। মালিক তার "আমার সাবস্ক্রিপশন" পেজে এই দামই দেখবেন।', 'The new price applies from the next payment. The owner sees this price on their subscription page.')}</p>
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" id="pr-save">${I('check')} ${L('সেভ করুন', 'Save')}</button></div>`, { width: 480 });
  $('#pr-save').onclick = (e) => act(e.currentTarget, async () => {
    const v = (id) => ($(id).value.trim() === '' ? '' : toNum($(id).value));
    await call('PUT', `/api/super/businesses/${id}/price`, { monthly: v('#pr-m'), yearly: v('#pr-y') });
    closeModal(); await loadSuper(); render(); toast(L('দাম সেভ হয়েছে', 'Price saved'));
  });
}
