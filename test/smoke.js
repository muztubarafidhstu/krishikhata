'use strict';
// API smoke test: starts the server on a temporary database and walks through the main flows.
// Run:  npm test
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kk-test-'));
const PORT = 3900 + Math.floor(Math.random() * 90);
const env = { ...process.env, DATA_DIR: dir, PORT: String(PORT), SUPER_PHONE: '01700000000', SUPER_PASSWORD: 'Super@1', GATEWAY_KEY: 'test-gateway-key-123456', APP_SECRET: 'x'.repeat(64) };
const base = `http://127.0.0.1:${PORT}`;

function client() {
  let cookie = '';
  return async (method, url, body, headers = {}) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', 'X-KK': '1', Cookie: cookie, ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };
}
const lastOtp = () => {
  const { DatabaseSync } = require('node:sqlite');
  const d = new DatabaseSync(path.join(dir, 'krishikhata.db'));
  const row = d.prepare("SELECT text FROM sms WHERE kind='otp' ORDER BY id DESC LIMIT 1").get(); d.close();
  return row.text.match(/\d{6}/)[0];
};

(async () => {
  const srv = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], { env, cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/api/health')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 100)); }
    const sup = client(), own = client(), sel = client(), anon = client();
    let r;

    r = await sup('POST', '/api/login', { phone: '01700000000', password: 'wrong@1' }); assert.equal(r.status, 401);
    r = await sup('POST', '/api/login', { phone: '০১৭০০০০০০০০', password: 'Super@1' }); assert.equal(r.status, 200); assert.equal(r.data.me.role, 'super');
    r = await anon('POST', '/api/login', { phone: '01700000000', password: 'Super@1' }, { 'X-KK': '' }); assert.equal(r.status, 403, 'CSRF header required');

    // Weak password refused
    const shop = { slug: 'test-shop', name: 'Test Shop', owner: 'Owner', cats: ['seed', 'fert'], modules: ['pur', 'due', 'exp', 'rep', 'box', 'shop'], admin: { phone: '01711000001', password: 'weak' }, sellers: [], plan: 'trial' };
    r = await sup('POST', '/api/super/businesses', shop); assert.equal(r.status, 400);
    shop.admin.password = 'Owner@1'; shop.sellers = [{ name: 'Seller', phone: '01811000001', password: 'Sell#1' }];
    r = await sup('POST', '/api/super/businesses', shop); assert.equal(r.status, 200); const bid = r.data.id;

    r = await own('POST', '/api/login', { phone: '01711000001', password: 'Owner@1' }); assert.equal(r.status, 200);
    r = await own('GET', '/api/biz/state'); assert.equal(r.status, 200); assert.ok(r.data.products.length > 0);
    const pid = r.data.products[0].id;
    r = await own('POST', '/api/biz/vendors', { name: 'Dealer', phone: '01900000000' }); const vid = r.data.id;
    r = await own('POST', '/api/biz/purchases', { vendor: vid, pid, qty: 10, rate: 90, paid: 300 }); assert.equal(r.status, 200);
    r = await own('POST', '/api/biz/sales', { cust: 'new', newCustomer: { name: 'Farmer', phone: '01922000000' }, items: [{ pid, qty: 3, price: 120 }], paid: 100 }); assert.equal(r.status, 200);
    const memo = r.data.memo;
    r = await own('POST', '/api/biz/sales', { cust: '0', items: [{ pid, qty: 3, price: 120 }], paid: 10 }); assert.equal(r.status, 400, 'walk-in must pay in full');
    r = await own('POST', '/api/biz/sales', { cust: '0', items: [{ pid, qty: 99, price: 120 }] }); assert.equal(r.status, 409, 'not enough stock');
    r = await own('GET', '/api/biz/state');
    assert.equal(r.data.products.find((p) => p.id === pid).stock, 7);
    assert.equal(r.data.customers[0].due, 260);
    assert.equal(r.data.vendors[0].due, 600);

    // Seller cannot see cost prices and sells at the admin price
    r = await sel('POST', '/api/login', { phone: '01811000001', password: 'Sell#1' }); assert.equal(r.status, 200);
    r = await sel('GET', '/api/biz/state'); assert.equal(r.data.products[0].buy, undefined); assert.equal(r.data.sales.length, 0);
    r = await sel('POST', '/api/biz/sales', { cust: '0', items: [{ pid, qty: 1, price: 1 }] }); assert.equal(r.status, 200);
    r = await sel('GET', '/api/biz/state'); assert.equal(r.data.sales[0].total, r.data.products.find((p) => p.id === pid).sell);
    r = await sel('POST', '/api/biz/expenses', { type: 'tea', amount: 50 }); assert.equal(r.status, 403);

    // Void restores stock and due
    r = await own('GET', '/api/biz/state'); const sid = r.data.sales.find((s) => s.id === memo).sid;
    r = await own('POST', `/api/biz/sales/${sid}/void`); assert.equal(r.status, 200);
    r = await own('GET', '/api/biz/state'); assert.equal(r.data.customers[0].due, 0); assert.equal(r.data.products.find((p) => p.id === pid).stock, 9);

    // OTP on: adding a seller needs the code
    r = await sup('PUT', '/api/super/settings', { otp: true }); assert.equal(r.data.otp, true);
    const body = { name: 'S2', phone: '01811000002', password: 'Sell#2' };
    r = await own('POST', '/api/biz/sellers', body); assert.equal(r.status, 428); const otpId = r.data.otpId;
    r = await own('POST', '/api/biz/sellers', { ...body, otpId, otpCode: '000000' }); assert.equal(r.status, 400); assert.ok(r.data.otpRetry);
    r = await own('POST', '/api/biz/sellers', { ...body, otpId, otpCode: lastOtp() }); assert.equal(r.status, 200); assert.equal(r.data.code, 'S-02');
    r = await sup('PUT', '/api/super/settings', { otp: false });
    r = await anon('POST', '/api/forgot', { phone: '01811000002', password: 'New#22' }); assert.equal(r.status, 403, 'forgot disabled while OTP off');

    // SMS gateway
    r = await anon('GET', '/api/gateway/pending'); assert.equal(r.status, 401);
    r = await anon('GET', '/api/gateway/pending?limit=10', null, { 'X-Gateway-Key': env.GATEWAY_KEY }); assert.equal(r.status, 200); assert.ok(r.data.length > 0);
    assert.ok(r.data[0].to.startsWith('+8801'));
    r = await anon('POST', '/api/gateway/result', { id: r.data[0].id, ok: true }, { 'X-Gateway-Key': env.GATEWAY_KEY }); assert.equal(r.status, 200);

    // Subscription lock
    r = await sup('POST', `/api/super/businesses/${bid}/deactivate`); assert.equal(r.status, 200);
    r = await own('POST', '/api/biz/expenses', { type: 'tea', amount: 50 }); assert.equal(r.status, 402);
    r = await own('GET', '/api/biz/state'); assert.equal(r.data.locked, true); assert.equal(r.data.sales.length, 0);
    r = await sup('POST', `/api/super/businesses/${bid}/payment`, { plan: 'monthly', qty: 2, method: 'bkash' }); assert.equal(r.status, 200); assert.equal(r.data.amount, 1000);
    r = await own('POST', '/api/biz/expenses', { type: 'tea', amount: '৫০' }); assert.equal(r.status, 200);

    // Super admin must re-enter the password to open a shop panel
    const sup2 = client();
    r = await sup2('POST', '/api/login', { phone: '01700000000', password: 'Super@1', remember: true }); assert.equal(r.status, 200);
    r = await sup2('GET', `/api/biz/state?bid=${bid}`); assert.equal(r.status, 403); assert.ok(r.data.needUnlock);
    r = await sup2('POST', '/api/super/unlock-shop', { bid, password: 'wrong@1' }); assert.equal(r.status, 400);
    r = await sup2('POST', '/api/super/unlock-shop', { bid, password: 'Super@1' }); assert.equal(r.status, 200);
    r = await sup2('GET', `/api/biz/state?bid=${bid}`); assert.equal(r.status, 200);

    // Reveal password (super only)
    r = await sup('GET', '/api/super/users'); const ownerUser = r.data.find((u) => u.phone === '01711000001');
    r = await sup('POST', `/api/super/users/${ownerUser.id}/reveal`); assert.equal(r.data.password, 'Owner@1');
    r = await own('POST', `/api/super/users/${ownerUser.id}/reveal`); assert.equal(r.status, 403);

    // Reset and restore
    r = await sup('POST', `/api/super/businesses/${bid}/reset`); assert.equal(r.status, 200);
    r = await own('GET', '/api/biz/state'); assert.equal(r.data.sales.length, 0);
    r = await sup('POST', `/api/super/businesses/${bid}/restore`); assert.equal(r.status, 200);
    r = await own('GET', '/api/biz/state'); assert.equal(r.data.sales.length, 1);

    // NirmanKhata shop: tin needs a company, name made from the details, units and categories
    const bshop = { slug: 'steel-shop', name: 'Steel', owner: 'Owner B', cats: ['rod', 'cement', 'tin', 'sheet'], modules: ['pur', 'due'], admin: { phone: '01711000009', password: 'Owner@9' }, sellers: [], plan: 'trial' };
    r = await sup('POST', '/api/super/businesses?type=build', bshop); assert.equal(r.status, 200);
    const bown = client();
    r = await bown('POST', '/api/login', { phone: '01711000009', password: 'Owner@9' }); assert.equal(r.status, 200);
    r = await bown('GET', '/api/biz/state'); assert.equal(r.data.btype, 'build'); assert.ok(r.data.products.some((p) => p.cat === 'tin' && p.perPack > 0));
    const tin = { cat: 'tin', catName: 'Tin', size: '0.32 mm', dims: '4 x 20 ft', unit: 'bundle', perPack: 12, buy: 9000, sell: 9500, min: 2 };
    r = await bown('POST', '/api/biz/products', tin); assert.equal(r.status, 400, 'tin needs a company');
    r = await bown('POST', '/api/biz/products', { ...tin, brand: 'PHP' }); assert.equal(r.status, 200);
    r = await bown('GET', '/api/biz/state'); const tp = r.data.products.find((p) => p.dims === '4 x 20 ft');
    assert.equal(tp.name, 'PHP Tin 0.32 mm (4 x 20 ft)'); assert.equal(tp.perPack, 12);
    r = await bown('POST', '/api/biz/products', { cat: 'angle', catName: 'Angle', size: 'MS', unit: 'kg', buy: 90, sell: 100 }); assert.equal(r.status, 400, 'angle not in this shop');
    r = await bown('POST', '/api/biz/products', { cat: 'sheet', catName: 'Sheet', size: 'SS', unit: 'ton', buy: 300000, sell: 330000 }); assert.equal(r.status, 200);

    // Correct logins are never blocked; only wrong passwords count
    { const c = client(); for (let i = 0; i < 12; i++) { r = await c('POST', '/api/login', { phone: '01711000009', password: 'Owner@9' }); assert.equal(r.status, 200, 'login ' + i); } }
    r = await bown('POST', '/api/login', { phone: '01711000009', password: ' Owner@9 ' }); assert.equal(r.status, 200, 'spaces around the password are ignored');

    // Purchase can be cancelled (stock and vendor due go back); expense can be deleted
    r = await bown('POST', '/api/biz/vendors', { name: 'Steel Dealer' }); const bv = r.data.id;
    r = await bown('GET', '/api/biz/state'); const sp = r.data.products.find((p) => p.cat === 'rod'); const stock0 = sp.stock;
    r = await bown('POST', '/api/biz/purchases', { vendor: bv, pid: sp.id, qty: 100, rate: 90, paid: 1000 }); assert.equal(r.status, 200);
    r = await bown('GET', '/api/biz/state'); const pu = r.data.purchases.at(-1); assert.equal(r.data.vendors.find((v) => v.id === bv).due, 8000);
    r = await bown('POST', `/api/biz/purchases/${pu.id}/void`); assert.equal(r.status, 200);
    r = await bown('GET', '/api/biz/state'); assert.equal(r.data.products.find((p) => p.id === sp.id).stock, stock0); assert.equal(r.data.vendors.find((v) => v.id === bv).due, 0); assert.equal(r.data.purchases.length, 0);
    r = await bown('POST', '/api/biz/expenses', { type: 'tea', amount: 40 }); r = await bown('GET', '/api/biz/state'); const ex = r.data.expenses.at(-1);
    r = await bown('POST', `/api/biz/expenses/${ex.id}/remove`); assert.equal(r.status, 200);
    r = await bown('GET', '/api/biz/state'); assert.equal(r.data.expenses.length, 0);

    // A removed seller's number can be added again
    r = await bown('POST', '/api/biz/sellers', { name: 'Rafiq', phone: '01811000077', password: 'Sell#7' }); assert.equal(r.status, 200);
    r = await bown('GET', '/api/biz/state'); const rs = r.data.sellers.find((x) => x.phone === '01811000077');
    r = await bown('POST', `/api/biz/sellers/${rs.uid}/remove`); assert.equal(r.status, 200);
    r = await bown('POST', '/api/biz/sellers', { name: 'Rafiq', phone: '01811000077', password: 'Sell#8' }); assert.equal(r.status, 200, 're-add removed seller');
    r = await client()('POST', '/api/login', { phone: '01811000077', password: 'Sell#8' }); assert.equal(r.status, 200);

    // Bike shop: vehicles with papers, buying date as the purchase date, sold one shows its selling date
    r = await sup('POST', '/api/super/businesses?type=bike', { slug: 'bike-shop', name: 'Bike House', owner: 'Owner C', cats: ['bike', 'parts'], modules: ['pur', 'due'], admin: { phone: '01711000033', password: 'Owner@3' }, sellers: [], plan: 'trial' });
    assert.equal(r.status, 200);
    const vown = client();
    r = await vown('POST', '/api/login', { phone: '01711000033', password: 'Owner@3' }); assert.equal(r.status, 200);
    const oldBike = { cat: 'bike', cond: 'old', brand: 'Honda', model: 'CBR 150R', year: '2020', cc: '150', color: 'Red', engine: 'kc23e1', chassis: 'me4kc1', regNo: 'Bogura-L 13-9999', regDate: '2020-08-15', buyDate: '2026-01-10', ownerName: 'Mizan', ownerPhone: '01755123456', buy: 230000, sell: 255000, paid: 200000 };
    r = await vown('POST', '/api/biz/vehicles', oldBike); assert.equal(r.status, 200); const vid1 = r.data.id;
    r = await vown('POST', '/api/biz/vehicles', { ...oldBike, model: 'Other', engine: 'x', chassis: 'ME4KC1' }); assert.equal(r.status, 409, 'same chassis twice');
    r = await vown('POST', '/api/biz/vehicles', { ...oldBike, buyDate: '2099-01-01', chassis: 'zz' }); assert.equal(r.status, 400, 'future buying date');
    r = await vown('POST', '/api/biz/products', { cat: 'bike', name: 'x', unit: 'piece', buy: 1, sell: 2 }); assert.equal(r.status, 400, 'bikes only through the vehicle form');
    r = await vown('POST', '/api/biz/vehicles', { cat: 'bike', cond: 'new', brand: 'Bajaj', model: 'Pulsar N160', year: '2025', chassis: 'md2b1', dealer: 'Uttara Motors', buy: 205000, sell: 222000 }); assert.equal(r.status, 200); const vid2 = r.data.id;
    r = await vown('GET', '/api/biz/state');
    const v1 = r.data.products.find((p) => p.id === vid1);
    assert.equal(v1.name, 'Honda CBR 150R (2020, Red)'); assert.equal(v1.stock, 1); assert.equal(v1.meta.chassis, 'ME4KC1'); assert.equal(v1.meta.ownerPhone, '01755123456');
    const pu1 = r.data.purchases.find((x) => x.items[0].pid === vid1); assert.equal(pu1.date, '2026-01-10'); assert.equal(pu1.paid, 200000);
    assert.equal(r.data.vendors.find((x) => x.name === 'Mizan').due, 30000);
    assert.equal(r.data.products.find((p) => p.id === vid2).meta.dealer, 'Uttara Motors');
    r = await vown('POST', '/api/biz/sales', { cust: 'new', newCustomer: { name: 'Buyer', phone: '01922000033' }, items: [{ pid: vid1, qty: 1, price: 250000 }], paid: 250000 }); assert.equal(r.status, 200);
    r = await vown('POST', '/api/biz/sales', { cust: '0', items: [{ pid: vid1, qty: 1, price: 250000 }] }); assert.equal(r.status, 409, 'a sold bike cannot be sold again');
    r = await vown('PUT', `/api/biz/vehicles/${vid1}`, { ...oldBike, buyDate: '2026-01-12', color: 'Black' }); assert.equal(r.status, 200);
    r = await vown('GET', '/api/biz/state'); assert.equal(r.data.purchases.find((x) => x.items[0].pid === vid1).date, '2026-01-12'); assert.equal(r.data.products.find((p) => p.id === vid1).meta.color, 'Black');
    const pu2 = r.data.purchases.find((x) => x.items[0].pid === vid2);
    r = await vown('POST', `/api/biz/purchases/${pu2.id}/void`); assert.equal(r.status, 200);
    r = await vown('GET', '/api/biz/state'); assert.ok(!r.data.products.find((p) => p.id === vid2), 'cancelling the purchase removes the bike');
    // Bike shop set up for used bikes only: every bike is saved as used; switch to new-only
    r = await sup('POST', '/api/super/businesses?type=bike', { slug: 'old-bikes', name: 'Puraton Bike Ghor', owner: 'Owner E', cats: ['bike'], modules: [], admin: { phone: '01711000055', password: 'Owner@5' }, sellers: [], plan: 'trial', vcond: 'old' });
    assert.equal(r.status, 200); const obid = r.data.id;
    const oown = client(); await oown('POST', '/api/login', { phone: '01711000055', password: 'Owner@5' });
    r = await oown('POST', '/api/biz/vehicles', { cat: 'bike', cond: 'new', model: 'FZS', buy: 1, sell: 2 }); assert.equal(r.status, 200);
    r = await oown('GET', '/api/biz/state'); assert.equal(r.data.vcond, 'old'); assert.equal(r.data.products[0].meta.cond, 'old');
    r = await sup('PUT', `/api/super/businesses/${obid}/vcond?type=bike`, { vcond: 'new' }); assert.equal(r.status, 200);
    r = await oown('POST', '/api/biz/vehicles', { cat: 'bike', cond: 'old', model: 'Pulsar', buy: 1, sell: 2 });
    r = await oown('GET', '/api/biz/state'); assert.equal(r.data.products.find((p) => p.meta.model === 'Pulsar').meta.cond, 'new');
    // Shop finder: address name, full shop name, a user's mobile number
    const loc = async (q) => (await fetch(base + '/go?q=' + encodeURIComponent(q), { redirect: 'manual' })).headers.get('location');
    assert.equal(await loc('old-bikes'), '/shop/old-bikes');
    assert.equal(await loc('  OLD BIKES '), '/shop/old-bikes');
    assert.equal(await loc('Puraton Bike Ghor'), '/shop/old-bikes');
    assert.equal(await loc('০১৭১১-০০০০৫৫'), '/shop/old-bikes/#id=01711000055');
    assert.ok((await loc('nobody-here')).startsWith('/?nf=1&q=nobody-here'));

    // Car shop: used cars only
    r = await sup('POST', '/api/super/businesses?type=car', { slug: 'car-shop', name: 'Car House', owner: 'Owner D', cats: ['car'], modules: [], admin: { phone: '01711000044', password: 'Owner@4' }, sellers: [], plan: 'trial' });
    const cown = client(); await cown('POST', '/api/login', { phone: '01711000044', password: 'Owner@4' });
    r = await cown('POST', '/api/biz/vehicles', { cat: 'car', cond: 'new', model: 'Axio', buy: 1650000, sell: 1800000 }); assert.equal(r.status, 200);
    r = await cown('GET', '/api/biz/state'); assert.equal(r.data.products[0].meta.cond, 'old'); assert.equal(r.data.btype, 'car');
    r = await sup('GET', '/api/super/state?type=car'); assert.equal(r.data.businesses.length, 1); assert.equal(r.data.plans.monthly, 799);

    // Sales pages: /app1 … /app8, old links redirect
    for (const n of [1, 2, 3, 8]) { const pr = await fetch(base + '/app' + n); assert.equal(pr.status, 200, '/app' + n); assert.ok((await pr.text()).includes('id="finder"')); }
    assert.equal((await fetch(base + '/app9')).status, 404);
    assert.equal((await fetch(base + '/nirman', { redirect: 'manual' })).headers.get('location'), '/app2');

    // One-tap demo: only shops marked as demo, signed in as their owner, no password
    const demoLogin = async (slug) => { const rr = await fetch(base + '/demo?shop=' + slug, { redirect: 'manual' }); const ck = (rr.headers.get('set-cookie') || '').split(';')[0]; return { loc: rr.headers.get('location'), ck }; };
    let dl = await demoLogin('old-bikes'); assert.equal(dl.loc, '/'); assert.equal(dl.ck, '', 'a normal shop is not a demo');
    { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(path.join(dir, 'krishikhata.db')); d.prepare("UPDATE businesses SET demo=1 WHERE slug='old-bikes'").run(); d.close(); }
    dl = await demoLogin('old-bikes'); assert.ok(dl.ck.startsWith('kk_'), 'demo shop signs in');
    r = await fetch(base + '/api/biz/state', { headers: { Cookie: dl.ck, 'X-KK': '1' } }); assert.equal(r.status, 200); assert.equal((await r.json()).name, 'Puraton Bike Ghor');
    r = await fetch(base + '/api/password', { method: 'POST', headers: { Cookie: dl.ck, 'X-KK': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ current: 'x', password: 'New@123' }) }); assert.equal(r.status, 403, 'demo password cannot be changed');
    assert.equal((await fetch(base + '/demo3', { redirect: 'manual' })).headers.get('location'), '/demo?shop=demobike');

    // Public shop page
    r = await anon('GET', '/api/public/shop/test-shop'); assert.equal(r.status, 200); assert.equal(r.data.products[0].buy, undefined);

    console.log('\n✓ all smoke tests passed');
  } catch (e) {
    console.error('\n✗ smoke test failed:', e.message); process.exitCode = 1;
  } finally {
    srv.kill(); fs.rmSync(dir, { recursive: true, force: true });
  }
})();
