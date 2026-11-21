'use strict';
/* Event wiring and start-up. */

async function boot() {
  const m = location.pathname.match(/^\/shop\/([a-z0-9-]+)\/?$/i);
  if (m) {
    S.pubSlug = m[1]; render();
    const r = await api('GET', '/api/public/shop/' + encodeURIComponent(m[1]));
    S.pub = r.ok ? r.data : { missing: true }; render(); return;
  }
  if (!S.me) { const r = await api('GET', '/api/me'); if (r.ok) { S.me = r.data.me; S.otp = r.data.otp; } }
  if (!S.me) { render(); return; }
  try {
    if (S.me.role === 'super') { await loadSuper(); S.otp = S.sup.otp; S.view = 'home'; }
    else { await loadBiz(); S.view = S.me.role === 'admin' ? 'dash' : 'sale'; }
  } catch (e) { if (!(e instanceof ApiErr)) console.error(e); }
  render();
}
function switchLang() {
  if (S.view === 'wizard') saveWizInputs();
  LANG = LANG === 'bn' ? 'en' : 'bn';
  try { localStorage.setItem('kk-lang', LANG); } catch (e) {}
  const inv = invOpen; render(); if (inv) showInvoice(inv);
}
function ownPass() {
  passModal(L('আমার পাসওয়ার্ড বদলান', 'Change my password'), `<span class="num">${esc(dg(fmtPhone(S.me.phone)))}</span>`,
    (pw, cur) => call('POST', '/api/password', { password: pw, current: cur }), true);
}
const refocus = (id, pos) => { const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };

document.addEventListener('submit', (e) => { if (e.target.id === 'loginform') { e.preventDefault(); doLogin(e.target.querySelector('button[type=submit]')); } });

document.addEventListener('click', async (e) => {
  const t = e.target.closest('button,a[data-copy],[data-nav],[data-close],[data-addseller]'); if (!t) return;
  const d = t.dataset;
  if (d.otp) return otpAnswer(d.otp);
  if (d.confirm) return confirmAnswer(d.confirm === 'yes');
  if (d.close !== undefined && (e.target === t || t.tagName === 'BUTTON')) { closeModal(); invOpen = null; if (confirmResolve) confirmAnswer(false); return; }
  if (d.nav) { closeModal(); if (S.view === 'wizard') saveWizInputs(); return go(d.nav); }
  if (d.logout !== undefined) { await api('POST', '/api/logout'); Object.assign(S, { me: null, cur: null, sup: null, bid: null, users: null, sms: null, revealed: {}, wiz: null, q: '', sq: '', dq: '' }); draft = null; return go('login'); }
  if (d.backsuper !== undefined) { S.bid = null; S.cur = null; draft = null; S.dq = ''; S.sq = ''; await act(t, loadSuper); return go('home'); }
  if (d.clearq) { if (d.clearq === 'sq') S.sq = ''; else S.q = ''; return render(); }
  if (d.lgeye !== undefined) { const i = $('#lg-pass'); i.type = i.type === 'password' ? 'text' : 'password'; t.innerHTML = I(i.type === 'password' ? 'eye' : 'eyeoff'); return; }
  if (d.forgot !== undefined) return showForgot();
  if (d.ownpass !== undefined) return ownPass();
  if (d.copy) { e.preventDefault(); try { await navigator.clipboard.writeText(d.copy); toast(L('লিংক কপি হয়েছে', 'Link copied')); } catch (err) { toast(d.copy); } return; }

  /* super */
  if (d.openbiz) return openBiz(d.openbiz);
  if (d.pay) return showPay(d.pay);
  if (d.savepay !== undefined) return savePay(t);
  if (d.react) return showReact(d.react);
  if (d.requick) { $('#re-date').value = addMonths(todayStr(), +d.requick); return updReact(); }
  if (d.resave !== undefined) return saveReact(t);
  if (d.deact) return deactivate(d.deact);
  if (d.reveal) return reveal(d.reveal, t);
  if (d.setpass) return setPassFor(d.setpass);
  if (d.resetbiz !== undefined) return resetBiz(t);
  if (d.restorebiz) return restoreBiz(d.restorebiz, t);
  if (d.smsrefresh !== undefined) return act(t, async () => { S.sms = await call('GET', '/api/super/sms'); await loadSuper(); render(); });
  if (d.smstest !== undefined) return act(t, async () => { await call('POST', '/api/super/sms/test', { phone: pk($('#sms-to').value) }); S.sms = null; toast(L('টেস্ট SMS লাইনে রাখা হয়েছে। ESP32 অনলাইন থাকলে কয়েক সেকেন্ডে যাবে।', 'Test SMS queued. It goes out within seconds if the ESP32 is online.')); });
  if (d.otptoggle !== undefined) {
    const on = !S.otp;
    if (on && !(await ask(L('OTP চালু করবেন? ESP32 SMS গেটওয়ে ঠিকমতো কাজ না করলে কেউ কোড পাবে না।', 'Switch OTP on? If the ESP32 SMS gateway is not working, nobody will receive codes.'), L('চালু করুন', 'Switch on')))) return;
    return act(t, async () => { const r = await call('PUT', '/api/super/settings', { otp: on }); S.otp = r.otp; S.sup.otp = r.otp; render(); toast(r.otp ? L('OTP চালু হয়েছে', 'OTP switched on') : L('OTP বন্ধ হয়েছে', 'OTP switched off')); });
  }
  if (d.saveplans !== undefined) return act(t, async () => { S.sup.plans = await call('PUT', '/api/super/plans', { monthly: toNum($('#pl-m').value), yearly: toNum($('#pl-y').value), trialDays: toNum($('#pl-t').value), payTo: pk($('#pl-to').value) }); render(); toast(L('সেভ হয়েছে', 'Saved')); });
  if (d.wnext !== undefined) { saveWizInputs(); const err = wizCheck(S.wiz); if (err) return toast(err, 'err'); S.wiz.step++; return render(); }
  if (d.wback !== undefined) { saveWizInputs(); S.wiz.step--; return render(); }
  if (d.wrun !== undefined) return runSetup(t);
  if (d.sadd !== undefined) { saveWizInputs(); if (S.wiz.sellers.length < 3) S.wiz.sellers.push({ name: '', phone: '', pass: '' }); return render(); }
  if (d.sdel) { saveWizInputs(); S.wiz.sellers.splice(+d.sdel, 1); return render(); }

  /* shop */
  if (d.pcat) { draft.pcat = d.pcat; document.querySelectorAll('[data-pcat]').forEach((x) => { x.classList.toggle('on', x.dataset.pcat === d.pcat); x.setAttribute('aria-pressed', x.dataset.pcat === d.pcat); }); $('#p-res').innerHTML = prodResults(); return; }
  if (d.addp) return addProduct(+d.addp);
  if (d.pickcust) { draft.cust = d.pickcust; draft.cq = ''; render(); return toast(L('ক্রেতা বাছাই হয়েছে', 'Customer selected')); }
  if (d.newcustph !== undefined) { draft.cust = 'new'; draft.newPhone = draft.cq; draft.cq = ''; render(); return $('#s-newname')?.focus(); }
  if (d.person) { const [k, id] = d.person.split(':'); return showPerson(k, id); }
  if (d.dline) { draft.lines.splice(+d.dline, 1); $('#lines').innerHTML = linesHTML(); $('#p-res').innerHTML = prodResults(); return updSum(); }
  if (d.savesale !== undefined) return saveSale(t);
  if (d.inv) return showInvoice(d.inv);
  if (d.dl) return downloadInvoice(d.dl, t);
  if (d.print !== undefined) return window.print();
  if (d.switchlang !== undefined) return switchLang();
  if (d.voidsale) {
    const s = S.cur.sales.find((x) => x.sid == d.voidsale);
    if (!(await ask(L(`মেমো #${dg(s.id)} বাতিল করবেন? স্টক ও বাকি আগের অবস্থায় ফিরে যাবে।`, `Cancel memo #${s.id}? Stock and due go back.`), L('বাতিল করুন', 'Cancel memo'), true))) return;
    return bizAct(null, () => call('POST', bizUrl(`/sales/${d.voidsale}/void`)), L('মেমো বাতিল হয়েছে', 'Memo cancelled'));
  }
  if (d.addprod !== undefined) return bizAct(t, () => call('POST', bizUrl('/products'), productBody()), L('নতুন পণ্য যোগ হয়েছে — ক্রয় থেকে স্টক যোগ করুন', 'Product added — add stock from Purchases'));
  if (d.editprod) return editProduct(d.editprod);
  if (d.saveprod) return bizAct(t, async () => { await call('PUT', bizUrl('/products/' + d.saveprod), productBody('pe')); closeModal(); }, L('পণ্য আপডেট হয়েছে', 'Product updated'));
  if (d.delprod) { if (!(await ask(L('পণ্যটি তালিকা থেকে সরাবেন? পুরোনো মেমো ঠিক থাকবে।', 'Remove this product from the list? Old memos stay as they are.'), L('সরান', 'Remove'), true))) return; return bizAct(null, () => call('POST', bizUrl(`/products/${d.delprod}/remove`)), L('সরানো হয়েছে', 'Removed')); }
  if (d.addvendor !== undefined) return addVendor();
  if (d.savevendor !== undefined) return bizAct(t, async () => { await call('POST', bizUrl('/vendors'), { name: $('#v-name').value, phone: pk($('#v-phone').value) }); closeModal(); }, L('ভেন্ডর যোগ হয়েছে', 'Vendor added'));
  if (d.savepur !== undefined) return bizAct(t, () => call('POST', bizUrl('/purchases'), { vendor: $('#p-vendor').value, pid: $('#p-prod').value, qty: toNum($('#p-qty').value), rate: toNum($('#p-rate').value), paid: toNum($('#p-paid').value) }), L('স্টকে যোগ হয়েছে', 'Added to stock'));
  if (d.collect) return bizAct(t, () => call('POST', bizUrl(`/customers/${d.collect}/collect`), { amount: toNum($('#col-' + d.collect).value) }), L('জমা নেওয়া হয়েছে', 'Collected'));
  if (d.mcollect) return act(t, async () => { await call('POST', bizUrl(`/customers/${d.mcollect}/collect`), { amount: toNum($('#mcol').value) }); await loadBiz(); render(); showPerson('c', d.mcollect); toast(L('জমা নেওয়া হয়েছে', 'Collected')); });
  if (d.vpay) return bizAct(t, () => call('POST', bizUrl(`/vendors/${d.vpay}/pay`), { amount: toNum($('#vp-' + d.vpay).value) }), L('পরিশোধ হয়েছে', 'Paid'));
  if (d.addexp !== undefined) return bizAct(t, () => call('POST', bizUrl('/expenses'), { type: $('#e-type').value, amount: toNum($('#e-amt').value), note: $('#e-note').value }), L('খরচ যোগ হয়েছে', 'Expense added'));
  if (d.opening !== undefined) {
    modal(`<h3>${I('money')} ${L('শুরুর নগদ ব্যালেন্স', 'Opening cash balance')}</h3>`, `<label class="f">${L('টাকা (৳)', 'Amount (৳)')}<input class="in num" id="op-amt" type="text" inputmode="decimal" data-amt value="${S.cur.opening}"></label>
      <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>${L('বাতিল', 'Cancel')}</button><button class="btn" data-saveopening>${I('check')} ${L('সেভ করুন', 'Save')}</button></div>`, { width: 420 });
    return;
  }
  if (d.saveopening !== undefined) return bizAct(t, async () => { await call('PUT', bizUrl('/opening'), { opening: toNum($('#op-amt').value) }); closeModal(); }, L('সেভ হয়েছে', 'Saved'));
  if (d.addseller !== undefined) return addSeller();
  if (d.assave !== undefined) {
    const name = $('#as-name').value.trim(), phone = pk($('#as-phone').value), password = $('#as-pass').value;
    if (!name) return toast(L('সেলারের নাম লিখুন', 'Enter the seller’s name'), 'err');
    if (!validPhone(phone)) return toast(L('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন', 'Enter a valid 11-digit mobile number'), 'err');
    if (!passOk(password)) return toast(passMsg(), 'err');
    return bizAct(t, async () => { await call('POST', bizUrl('/sellers'), { name, phone, password }); closeModal(); }, L('সেলার আইডি চালু হয়েছে', 'Seller ID is active'));
  }
  if (d.sellerpass) { const s = S.cur.sellers.find((x) => x.uid == d.sellerpass); return passModal(L('সেলারের নতুন পাসওয়ার্ড', 'New seller password'), `${esc(s.name)} · <span class="num">${esc(dg(fmtPhone(s.phone)))}</span>`, (pw) => call('POST', bizUrl(`/sellers/${s.uid}/password`), { password: pw })); }
  if (d.rmseller) {
    const s = S.cur.sellers.find((x) => x.uid == d.rmseller);
    if (!(await ask(L(`<b>${esc(s.name)}</b>-এর সেলার আইডি বাদ দেবেন? তিনি আর লগইন করতে পারবেন না। তার আগের বিক্রি থাকবে।`, `Remove <b>${esc(s.name)}</b>’s seller ID? They can no longer sign in. Their past sales stay.`), L('বাদ দিন', 'Remove'), true))) return;
    return bizAct(null, () => call('POST', bizUrl(`/sellers/${s.uid}/remove`)), L('সেলার বাদ দেওয়া হয়েছে', 'Seller removed'));
  }
});

document.addEventListener('change', (e) => {
  const t = e.target, d = t.dataset;
  if (d.wcat) { const w = S.wiz; w.cats = t.checked ? [...new Set([...w.cats, d.wcat])] : w.cats.filter((k) => k !== d.wcat); t.closest('.tile').classList.toggle('sel', t.checked); }
  if (d.wmod) { const w = S.wiz; w.modules = t.checked ? [...new Set([...w.modules, d.wmod])] : w.modules.filter((k) => k !== d.wmod); t.closest('.mod').classList.toggle('sel', t.checked); }
  if (d.wstarter !== undefined) { S.wiz.starter = t.checked; t.closest('.mod').classList.toggle('sel', t.checked); }
  if (d.wplan) { S.wiz.plan = d.wplan; document.querySelectorAll('[data-wplan]').forEach((x) => x.closest('.tile').classList.toggle('sel', x.checked)); $('#w-paybox').hidden = d.wplan === 'trial'; }
  if (t.id === 'pay-plan' || t.id === 'pay-qty') updPay();
  if (t.id === 'pay-date') { t.dataset.touched = '1'; updPay(); }
  if (t.id === 're-date') updReact();
  if (t.id === 's-cust' && draft) { draft.cust = t.value; $('#newcustwrap').hidden = t.value !== 'new'; if (t.value === 'new') $('#s-newname').focus(); }
});

document.addEventListener('input', (e) => {
  const t = e.target, d = t.dataset;
  if (t.id) { const r = document.querySelector(`[data-rulesfor="${t.id}"]`); if (r) r.innerHTML = rulesHTML(t.value); }
  if (t.id === 'pay-qty') updPay();
  if (t.id === 'q' || t.id === 'sq') { if (t.id === 'q') S.q = t.value; else S.sq = t.value; const pos = t.selectionStart; render(); return refocus(t.id, pos); }
  if (t.id === 'd-q') { S.dq = t.value; $('#d-res').innerHTML = personResults(); return; }
  if (!draft) return;
  if (t.id === 's-pq') { draft.pq = t.value; $('#p-res').innerHTML = prodResults(); return; }
  if (t.id === 's-cq') { draft.cq = t.value; $('#cq-res').innerHTML = custResults(); return; }
  if (d.lq !== undefined) { draft.lines[+d.lq].qty = Math.max(toNum(t.value), 0); updSum(); }
  if (d.lr !== undefined) { draft.lines[+d.lr].price = Math.max(toNum(t.value), 0); updSum(); }
  if (t.id === 's-paid') { draft.paid = t.value; updSum(); }
  if (t.id === 's-newname') draft.newName = t.value;
  if (t.id === 's-newvillage') draft.newVillage = t.value;
  if (t.id === 's-newphone') draft.newPhone = t.value;
});
// Typing ৫০০+২০০ in an amount box becomes 700 when you leave the box.
document.addEventListener('focusout', (e) => {
  const t = e.target; if (!t.matches || !t.matches('[data-amt]')) return;
  const raw = t.value.trim(); if (!raw || /^\d+(\.\d+)?$/.test(raw)) return;
  t.value = String(toNum(raw)); t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true }));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'otp-in') { e.preventDefault(); return otpAnswer('ok'); }
  if (e.key === 'Escape') { if (otpResolve) return otpAnswer('cancel'); if (confirmResolve) return confirmAnswer(false); closeModal(); invOpen = null; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button]')) { e.preventDefault(); e.target.click(); }
});

$('#langbtn').addEventListener('click', switchLang);
$('#bellbtn').addEventListener('click', showNotes);
function themeIcon() { const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); $('#themebtn').innerHTML = I(dark ? 'sun' : 'moon'); return dark; }
$('#themebtn').addEventListener('click', () => { const dark = themeIcon(); document.documentElement.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('kk-theme', document.documentElement.dataset.theme); } catch (e) {} themeIcon(); });
try { const th = localStorage.getItem('kk-theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) {}
themeIcon();
boot();
