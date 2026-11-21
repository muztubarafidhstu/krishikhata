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

    // Public shop page
    r = await anon('GET', '/api/public/shop/test-shop'); assert.equal(r.status, 200); assert.equal(r.data.products[0].buy, undefined);

    console.log('\n✓ all smoke tests passed');
  } catch (e) {
    console.error('\n✗ smoke test failed:', e.message); process.exitCode = 1;
  } finally {
    srv.kill(); fs.rmSync(dir, { recursive: true, force: true });
  }
})();
