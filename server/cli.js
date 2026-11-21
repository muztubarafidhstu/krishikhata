'use strict';
// Usage: npm run seed-demo | npm run reset-super -- <phone> <newPassword> | npm run backup
const { get, run, tx, today, addDays, addMonths } = require('./db');
const { hashPassword, encrypt, normPhone, validPhone, passOk } = require('./security');
const { createBusiness } = require('./business');
const jobs = require('./jobs');

const [cmd, a1, a2] = process.argv.slice(2);

if (cmd === 'backup') {
  console.log('Backup written:', jobs.backup());
} else if (cmd === 'reset-super') {
  const phone = normPhone(a1);
  if (!validPhone(phone) || !passOk(a2 || '')) { console.error('Usage: npm run reset-super -- 017XXXXXXXX "New@pass1"'); process.exit(1); }
  const u = get("SELECT * FROM users WHERE role='super'");
  if (u) run('UPDATE users SET phone=?, pass_hash=?, pass_enc=?, active=1 WHERE id=?', phone, hashPassword(a2), encrypt(a2), u.id);
  else run("INSERT INTO users(role,name,phone,pass_hash,pass_enc) VALUES('super','Super Admin',?,?,?)", phone, hashPassword(a2), encrypt(a2));
  run('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role=\'super\')');
  console.log('Super admin login is now', phone);
} else if (cmd === 'seed-demo') {
  // Three sample shops with a week of sales — for trying the system. Do not run on your real server.
  if (get("SELECT 1 x FROM businesses WHERE slug='sabuj'")) { console.log('Demo data already exists.'); process.exit(0); }
  const mk = (d) => createBusiness({ ...d, starter: true, plan: 'monthly', payMethod: 'bkash' });
  const shops = [
    mk({ name: 'সবুজ কৃষি ভাণ্ডার', slug: 'sabuj', owner: 'মোঃ রহিম উদ্দিন', place: 'বগুড়া সদর', cats: ['seed', 'fert', 'pest'], modules: ['inv', 'cat', 'pur', 'sale', 'invc', 'due', 'exp', 'rep', 'box', 'shop'],
      admin: { phone: '01711100001', password: 'Rahim@12' }, sellers: [{ name: 'জামাল', phone: '01811200001', password: 'Jamal#1' }, { name: 'সাকিব', phone: '01811200002', password: 'Sakib#2' }, { name: 'রুবেল', phone: '01811200003', password: 'Rubel#3' }], opening: 150000 }),
    mk({ name: 'মাটির বন্ধু ট্রেডার্স', slug: 'matirbondhu', owner: 'করিম শেখ', place: 'পীরগাছা, রংপুর', cats: ['fert', 'pest'], modules: ['inv', 'cat', 'pur', 'sale', 'invc', 'due', 'exp', 'rep', 'shop'],
      admin: { phone: '01722100002', password: 'Karim@22' }, sellers: [{ name: 'নয়ন', phone: '01822200004', password: 'Nayan#4' }], opening: 90000 }),
    mk({ name: 'শস্য বীজ ঘর', slug: 'shasya', owner: 'নাসরিন আক্তার', place: 'দিনাজপুর', cats: ['seed'], modules: ['inv', 'cat', 'pur', 'sale', 'invc', 'due', 'exp', 'rep'],
      admin: { phone: '01733100003', password: 'Nasrin@3' }, sellers: [{ name: 'মিতু', phone: '01833200006', password: 'Mitu#66' }], opening: 60000 }),
  ];
  run('UPDATE businesses SET expiry=? WHERE id=?', addDays(today(), 4), shops[1]);
  run('UPDATE businesses SET expiry=? WHERE id=?', addDays(today(), -6), shops[2]);
  run('UPDATE businesses SET expiry=?, plan=? WHERE id=?', addMonths(today(), 7), 'yearly', shops[0]);
  fillSample(shops[0]);
  console.log('Demo shops created. Logins: 01711100001 / Rahim@12 (admin), 01811200001 / Jamal#1 (seller).');
} else if (cmd === 'mark-demo') {
  // npm run mark-demo -- rafid        (add "off" to undo)
  const b = get('SELECT id FROM businesses WHERE slug=?', String(a1 || ''));
  if (!b) { console.error('No shop with address: ' + a1); process.exit(1); }
  run('UPDATE businesses SET demo=? WHERE id=?', a2 === 'off' ? 0 : 1, b.id);
  console.log(a2 === 'off' ? `${a1}: demo protection OFF` : `${a1}: demo protection ON (logins can't be changed by visitors)`);
} else if (cmd === 'refill-demo') {
  // npm run refill-demo -- demosteel   → wipes a DEMO shop and fills it again with fresh sample data
  const b = get('SELECT * FROM businesses WHERE slug=?', String(a1 || ''));
  if (!b) { console.error('No shop with address: ' + a1); process.exit(1); }
  if (!b.demo) { console.error('Only demo shops can be refilled (mark it first: npm run mark-demo -- ' + a1 + ')'); process.exit(1); }
  const { STARTER } = require('./core');
  tx(() => {
    for (const t of ['sales', 'purchases', 'expenses', 'collections', 'vendor_payments', 'customers', 'vendors', 'products']) run(`DELETE FROM ${t} WHERE business_id=?`, b.id);
    run('UPDATE businesses SET next_inv=1001 WHERE id=?', b.id);
    let n = 1;
    for (const p of STARTER.filter((x) => JSON.parse(b.cats).includes(x.cat)))
      run('INSERT INTO products(business_id,name,cat,unit,buy,sell,stock,min_stock,box,brand,size,dims,weight,per_pack) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', b.id, p.name, p.cat, p.unit, p.buy, p.sell, 0, p.min, 'B-' + String(n++).padStart(2, '0'), p.brand || '', p.size || '', p.dims || '', p.weight ?? null, p.per_pack ?? null);
    fillSample(b.id, (b.btype || 'agri') === 'build');
  });
  console.log(`Demo shop ${a1} refilled with fresh sample data.`);
} else if (cmd === 'demo-shop') {
  // A ready-made demo shop to show customers:  npm run demo-shop -- demoshop 01XXXXXXXXX "Demo@123" [sellerPhone "Seller#1"]
  const build = process.argv.includes('--build');
  const [slug, phone, pass, sPhone, sPass] = process.argv.slice(3).filter((x) => x !== '--build');
  const { slugValid } = require('./host');
  if (!slugValid(String(slug || '')) || !validPhone(phone) || !passOk(pass || '') || (sPhone && (!validPhone(sPhone) || !passOk(sPass || '')))) {
    console.error('Usage: npm run demo-shop -- demoshop 01XXXXXXXXX "Demo@123" [01YYYYYYYYY "Seller#1"]\n(address: small English letters/numbers; passwords: 5+ chars with a letter, a number and a symbol)'); process.exit(1);
  }
  if (get('SELECT 1 x FROM businesses WHERE slug=?', slug)) { console.error('A shop with this address already exists.'); process.exit(1); }
  for (const p of [phone, sPhone].filter(Boolean)) if (get('SELECT 1 x FROM users WHERE phone=?', normPhone(p))) { console.error('This mobile number already has an ID: ' + p); process.exit(1); }
  const bid = createBusiness({ btype: build ? 'build' : 'agri', name: build ? 'ডেমো স্টিল অ্যান্ড সিমেন্ট' : 'ডেমো কৃষি ভাণ্ডার', slug, owner: 'ডেমো মালিক', place: 'বগুড়া সদর', cats: build ? ['rod', 'cement', 'tin', 'sheet', 'angle', 'bar', 'other'] : ['seed', 'fert', 'pest'],
    modules: ['inv', 'cat', 'pur', 'sale', 'invc', 'due', 'exp', 'rep', 'box', 'shop'], admin: { phone, password: pass },
    sellers: sPhone ? [{ name: 'ডেমো সেলার', phone: sPhone, password: sPass }] : [], opening: 150000, starter: true, plan: 'trial' });
  run("UPDATE businesses SET plan='yearly', expiry=?, demo=1 WHERE id=?", addMonths(today(), 60), bid);
  fillSample(bid, build);
  console.log(`Demo shop ready: https://${slug}.${process.env.DOMAIN || 'your-domain'}  login ${normPhone(phone)}` + (sPhone ? `, seller ${normPhone(sPhone)}` : ''));
} else {
  console.log('Commands: seed-demo | demo-shop <address> <phone> <password> [sellerPhone sellerPassword] | reset-super <phone> <password> | backup');
}

// Sample stock, customers, vendors, a week of sales and some expenses for one shop.
function fillSample(bid, build = false) {
  if (build) {
    // Demo brands so the shop looks real; owners type their own brands.
    for (const [like, brand] of [['MS Rod 500W%', 'BSRM'], ['MS Rod 400W%', 'KSRM'], ['Cement PCC%', 'Shah'], ['Cement OPC%', 'Seven Rings'], ['Tin 0.32%', 'PHP'], ['Tin 0.36%', 'KY Steel']])
      run("UPDATE products SET brand=?, name=? || ' ' || name WHERE business_id=? AND name LIKE ?", brand, brand, bid, like);
  }
  run("UPDATE products SET stock=CASE WHEN unit IN ('kg') AND cat IN ('rod','angle','bar','sheet') THEN 3000 WHEN cat='fert' THEN 60 ELSE 120 END WHERE business_id=?", bid);
  const custs = [['আব্দুল মালেক', 'শিবগঞ্জ', '01999000001'], ['হাসান আলী', 'মহাস্থান', '01999000002'], ['সুফিয়া বেগম', 'গাবতলী', '01999000003'], ['রফিকুল ইসলাম', 'নন্দীগ্রাম', '01999000004']]
    .map(([n, v, p]) => Number(run('INSERT INTO customers(business_id,name,village,phone,due) VALUES(?,?,?,?,0)', bid, n, v, p).lastInsertRowid));
  const v1 = Number(run('INSERT INTO vendors(business_id,name,phone,due) VALUES(?,?,?,?)', bid, build ? 'জেলা রড ডিলার' : 'জেলা সার ডিলার', '01999000011', 48000).lastInsertRowid);
  run('INSERT INTO vendors(business_id,name,phone,due) VALUES(?,?,?,?)', bid, build ? 'সিমেন্ট পরিবেশক' : 'উত্তরবঙ্গ সীড কোম্পানি', '01999000012', 12500);
  const prods = require('./db').all('SELECT * FROM products WHERE business_id=? ORDER BY id', bid);
  const sellers = require('./db').all("SELECT * FROM users WHERE business_id=? AND role='seller' ORDER BY seller_code", bid);
  const plan = [[6, 1, [[0, 10], [4, 2]], 1], [6, -1, [[8, 3]], 1], [5, 2, [[4, 5], [6, 2]], 0.6], [4, 1, [[5, 3], [9, 4]], 0.5], [3, -1, [[2, 6], [8, 5]], 1], [2, 2, [[0, 20]], 1], [1, 3, [[4, 4], [5, 2]], 0.4], [0, 2, [[4, 3], [8, 2]], 1], [0, 1, [[1, 2], [11, 1]], 0.5]];
  plan.forEach(([d, ci, items, ratio], k) => {
    const its = items.map(([pi, q]) => ({ p: prods[pi], q: build && prods[pi].unit === 'kg' ? q * 50 : q })); // steel is sold by the kilo
    const total = its.reduce((s, x) => s + x.p.sell * x.q, 0);
    const cust = ci >= 0 ? custs[ci] : null;
    const paid = cust ? Math.min(total, Math.round(total * ratio / 50) * 50) : total;
    const memo = get('SELECT next_inv FROM businesses WHERE id=?', bid).next_inv;
    run('UPDATE businesses SET next_inv=next_inv+1 WHERE id=?', bid);
    const seller = sellers.length ? sellers[k % sellers.length] : null;
    const sid = Number(run('INSERT INTO sales(business_id,memo_no,date,customer_id,total,paid,seller_user_id,seller_label) VALUES(?,?,?,?,?,?,?,?)', bid, memo, addDays(today(), -d), cust, total, paid, seller ? seller.id : null, seller ? seller.seller_code : 'admin').lastInsertRowid);
    its.forEach((x) => { run('INSERT INTO sale_items(sale_id,product_id,qty,price,cost) VALUES(?,?,?,?,?)', sid, x.p.id, x.q, x.p.sell, x.p.buy); run('UPDATE products SET stock=stock-? WHERE id=?', x.q, x.p.id); });
    if (cust && total > paid) run('UPDATE customers SET due=due+? WHERE id=?', total - paid, cust);
  });
  run('INSERT INTO purchases(business_id,date,vendor_id,product_id,qty,rate,total,paid) VALUES(?,?,?,?,?,?,?,?)', bid, addDays(today(), -9), v1, prods[4].id, 20, prods[4].buy, prods[4].buy * 20, 0);
  [['tea', 300, ''], ['transport', 1200, build ? 'ট্রাক ভাড়া — রড আনা' : 'ট্রাক ভাড়া — সার আনা'], ['power', 450, ''], ['salary', 1000, 'দৈনিক মজুরি']].forEach(([t, a, n], i) => run('INSERT INTO expenses(business_id,date,type,amount,note) VALUES(?,?,?,?,?)', bid, addDays(today(), -(6 - i)), t, a, n));
}
