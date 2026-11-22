'use strict';
// Usage: npm run seed-demo | npm run reset-super -- <phone> <newPassword> | npm run backup
const { get, run, tx, today, addDays, addMonths } = require('./db');
const { hashPassword, encrypt, normPhone, validPhone, passOk } = require('./security');
const { createBusiness } = require('./business');
const jobs = require('./jobs');

const DEMO_NAME = { agri: 'ডেমো কৃষি ভাণ্ডার', build: 'ডেমো স্টিল অ্যান্ড সিমেন্ট', bike: 'ডেমো বাইক হাউজ', brick: 'ডেমো ব্রিকস', mobile: 'ডেমো মোবাইল গ্যালারি', furniture: 'ডেমো ফার্নিচার', car: 'ডেমো কার হাউজ', hardware: 'ডেমো হার্ডওয়্যার অ্যান্ড স্যানিটারি' };
const VENDOR_NAMES = { agri: ['জেলা সার ডিলার', 'উত্তরবঙ্গ সীড কোম্পানি'], build: ['জেলা রড ডিলার', 'সিমেন্ট পরিবেশক'], bike: ['পার্টস হোলসেল (বংশাল)', 'লুব্রিকেন্ট ডিস্ট্রিবিউটর'],
  brick: ['কয়লা সরবরাহকারী', 'মাটি ও বালু সরবরাহ'], mobile: ['স্মার্ট ডিস্ট্রিবিউটর', 'এক্সেসরিজ হোলসেল'], furniture: ['কাঠের আড়ত', 'ফোম ও কাপড় সাপ্লায়ার'],
  car: ['কার পার্টস হোলসেল', 'টায়ার ডিস্ট্রিবিউটর'], hardware: ['পাইপ-ফিটিংস ডিলার', 'স্যানিটারি পরিবেশক'] };

// Sample vehicles for bike / car demo shops: some still in stock, some sold (with dates).
const SAMPLE_VEHICLES = {
  bike: [
    { cond: 'old', brand: 'Honda', model: 'CB Hornet 160R', year: '2019', color: 'লাল', cc: '160', engine: 'KC08E5012345', chassis: 'ME4KC0812K8012345', regNo: 'বগুড়া-ল ১১-২৩৪৫', regDate: '2019-05-10', ownerName: 'রাকিব হাসান', ownerPhone: '01712000001', buy: 145000, sell: 165000, bought: 40, sold: 20, cust: 0 },
    { cond: 'old', brand: 'Yamaha', model: 'FZS V3', year: '2021', color: 'কালো', cc: '150', engine: 'G3H8E0123456', chassis: 'ME1RG4719M0012345', regNo: 'বগুড়া-ল ১২-৪৫৬৭', regDate: '2021-03-02', ownerName: 'সাকিব আল হাসান', ownerPhone: '01712000002', buy: 175000, sell: 192000, bought: 25 },
    { cond: 'new', brand: 'Bajaj', model: 'Pulsar N160', year: '2025', color: 'নীল', cc: '160', engine: 'PFZWRK12345', chassis: 'MD2B92BX5RWK12345', dealer: 'উত্তরা মোটরস (বাজাজ ডিলার)', buy: 205000, sell: 222000, bought: 15, sold: 5, cust: 1 },
    { cond: 'old', brand: 'Suzuki', model: 'Gixxer SF', year: '2020', color: 'সাদা', cc: '155', engine: 'BG4AE1023456', chassis: 'MB8NG4BA3L8123456', ownerName: 'তানভীর আহমেদ', ownerPhone: '01712000004', buy: 160000, sell: 178000, bought: 10 },
    { cond: 'new', brand: 'TVS', model: 'Apache RTR 160 4V', year: '2025', color: 'কালো', cc: '160', engine: 'OE4LR1234567', chassis: 'MD626EG76R1L12345', dealer: 'টিভিএস অটো বাংলাদেশ', buy: 198000, sell: 214000, bought: 3 },
  ],
  car: [
    { cond: 'old', brand: 'Toyota', model: 'Axio', year: '2016', color: 'সাদা', cc: '1500', engine: '1NZ-A123456', chassis: 'NZE161-7123456', regNo: 'ঢাকা মেট্রো-গ ৩৫-১২৩৪', regDate: '2018-02-11', ownerName: 'মাহমুদুল হক', ownerPhone: '01713000001', buy: 1650000, sell: 1820000, bought: 60, sold: 12, cust: 0 },
    { cond: 'old', brand: 'Toyota', model: 'Premio', year: '2017', color: 'সিলভার', cc: '1500', engine: '1NZ-B234567', chassis: 'NZT260-3123456', regNo: 'ঢাকা মেট্রো-গ ৩৭-৪৫৬৭', regDate: '2019-07-21', ownerName: 'ফারহানা ইসলাম', ownerPhone: '01713000002', buy: 2350000, sell: 2550000, bought: 30 },
    { cond: 'old', brand: 'Honda', model: 'Vezel Hybrid', year: '2018', color: 'কালো', cc: '1500', engine: 'LEB-C345678', chassis: 'RU3-1234567', regNo: 'ঢাকা মেট্রো-গ ৩৮-৭৮৯০', regDate: '2020-01-05', ownerName: 'আরিফ চৌধুরী', ownerPhone: '01713000003', buy: 2600000, sell: 2850000, bought: 20 },
    { cond: 'old', brand: 'Nissan', model: 'X-Trail', year: '2015', color: 'ধূসর', cc: '2000', engine: 'MR20-D456789', chassis: 'NT32-0123456', regNo: 'চট্ট মেট্রো-গ ১১-২২৩৩', regDate: '2017-09-14', ownerName: 'জাহিদ হাসান', ownerPhone: '01713000004', buy: 2100000, sell: 2300000, bought: 45, sold: 8, cust: 2 },
  ],
};

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
  const { starterFor } = require('./core');
  tx(() => {
    for (const t of ['sales', 'purchases', 'expenses', 'collections', 'vendor_payments', 'customers', 'vendors', 'products']) run(`DELETE FROM ${t} WHERE business_id=?`, b.id);
    run('UPDATE businesses SET next_inv=1001 WHERE id=?', b.id);
    let n = 1;
    for (const p of starterFor(b.btype || 'agri', JSON.parse(b.cats)))
      run('INSERT INTO products(business_id,name,cat,unit,buy,sell,stock,min_stock,box,brand,size,dims,weight,per_pack) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', b.id, p.name, p.cat, p.unit, p.buy, p.sell, 0, p.min, 'B-' + String(n++).padStart(2, '0'), p.brand || '', p.size || '', p.dims || '', p.weight ?? null, p.per_pack ?? null);
    fillSample(b.id, b.btype || 'agri');
  });
  console.log(`Demo shop ${a1} refilled with fresh sample data.`);
} else if (cmd === 'demo-shop') {
  // A ready-made demo shop to show customers:
  //   npm run demo-shop -- demoshop 01XXXXXXXXX "Demo@123" [sellerPhone "Seller#1"] [--type=bike]   (--build = --type=build)
  const { SEG } = require('./segments');
  const tArg = process.argv.find((x) => x.startsWith('--type='));
  const type = process.argv.includes('--build') ? 'build' : tArg ? tArg.slice(7) : 'agri';
  if (!SEG[type]) { console.error('Unknown type. Use one of: ' + Object.keys(SEG).join(', ')); process.exit(1); }
  const [slug, phone, pass, sPhone, sPass] = process.argv.slice(3).filter((x) => !x.startsWith('--'));
  const { slugValid } = require('./host');
  if (!slugValid(String(slug || '')) || !validPhone(phone) || !passOk(pass || '') || (sPhone && (!validPhone(sPhone) || !passOk(sPass || '')))) {
    console.error('Usage: npm run demo-shop -- demoshop 01XXXXXXXXX "Demo@123" [01YYYYYYYYY "Seller#1"] [--type=bike]\n(address: small English letters/numbers; passwords: 5+ chars with a letter, a number and a symbol)'); process.exit(1);
  }
  if (get('SELECT 1 x FROM businesses WHERE slug=?', slug)) { console.error('A shop with this address already exists.'); process.exit(1); }
  for (const p of [phone, sPhone].filter(Boolean)) if (get('SELECT 1 x FROM users WHERE phone=? AND active=1', normPhone(p))) { console.error('This mobile number already has an ID: ' + p); process.exit(1); }
  const bid = createBusiness({ btype: type, name: DEMO_NAME[type], slug, owner: 'ডেমো মালিক', place: 'বগুড়া সদর', cats: SEG[type].cats,
    modules: ['inv', 'cat', 'pur', 'sale', 'invc', 'due', 'exp', 'rep', 'box', 'shop'], admin: { phone, password: pass },
    sellers: sPhone ? [{ name: 'ডেমো সেলার', phone: sPhone, password: sPass }] : [], opening: type === 'car' ? 5000000 : type === 'bike' ? 800000 : 150000, starter: true, plan: 'trial' });
  run("UPDATE businesses SET plan='yearly', expiry=?, demo=1 WHERE id=?", addMonths(today(), 60), bid);
  fillSample(bid, type);
  console.log(`Demo shop ready: https://${slug}.${process.env.DOMAIN || 'your-domain'}  login ${normPhone(phone)}` + (sPhone ? `, seller ${normPhone(sPhone)}` : ''));
} else {
  console.log('Commands: seed-demo | demo-shop <address> <phone> <password> [sellerPhone sellerPassword] [--type=agri|build|bike|brick|mobile|furniture|car|hardware] | refill-demo <address> | mark-demo <address> | reset-super <phone> <password> | backup');
}

// Sample stock, customers, vendors, a week of sales and some expenses for one shop.
function fillSample(bid, type = 'agri') {
  if (type === true) type = 'build';
  const build = type === 'build';
  if (build) {
    // Demo brands so the shop looks real; owners type their own brands.
    for (const [like, brand] of [['MS Rod 500W%', 'BSRM'], ['MS Rod 400W%', 'KSRM'], ['Cement PCC%', 'Shah'], ['Cement OPC%', 'Seven Rings'], ['Tin 0.32%', 'PHP'], ['Tin 0.36%', 'KY Steel']])
      run("UPDATE products SET brand=?, name=? || ' ' || name WHERE business_id=? AND name LIKE ?", brand, brand, bid, like);
  }
  run("UPDATE products SET stock=CASE WHEN unit IN ('kg') AND cat IN ('rod','angle','bar','sheet') THEN 3000 WHEN cat='fert' THEN 60 WHEN unit IN ('cft') THEN 3000 WHEN unit IN ('thousand') THEN 150 WHEN sell > 5000 THEN 30 ELSE 120 END WHERE business_id=?", bid);
  const custs = [['আব্দুল মালেক', 'শিবগঞ্জ', '01999000001'], ['হাসান আলী', 'মহাস্থান', '01999000002'], ['সুফিয়া বেগম', 'গাবতলী', '01999000003'], ['রফিকুল ইসলাম', 'নন্দীগ্রাম', '01999000004']]
    .map(([n, v, p]) => Number(run('INSERT INTO customers(business_id,name,village,phone,due) VALUES(?,?,?,?,0)', bid, n, v, p).lastInsertRowid));
  const [vn1, vn2] = VENDOR_NAMES[type] || VENDOR_NAMES.agri;
  const v1 = Number(run('INSERT INTO vendors(business_id,name,phone,due) VALUES(?,?,?,?)', bid, vn1, '01999000011', 0).lastInsertRowid);
  run('INSERT INTO vendors(business_id,name,phone,due) VALUES(?,?,?,?)', bid, vn2, '01999000012', 12500);
  const prods = require('./db').all('SELECT * FROM products WHERE business_id=? ORDER BY id', bid);
  const sellers = require('./db').all("SELECT * FROM users WHERE business_id=? AND role='seller' ORDER BY seller_code", bid);
  const sale = (d, cust, its, ratio, k) => {
    const total = its.reduce((s, x) => s + x.p.sell * x.q, 0);
    const paid = cust ? Math.min(total, Math.round(total * ratio / 50) * 50) : total;
    const memo = get('SELECT next_inv FROM businesses WHERE id=?', bid).next_inv;
    run('UPDATE businesses SET next_inv=next_inv+1 WHERE id=?', bid);
    const seller = sellers.length && k !== null ? sellers[k % sellers.length] : null;
    const sid = Number(run('INSERT INTO sales(business_id,memo_no,date,customer_id,total,paid,seller_user_id,seller_label) VALUES(?,?,?,?,?,?,?,?)', bid, memo, addDays(today(), -d), cust, total, paid, seller ? seller.id : null, seller ? seller.seller_code : 'admin').lastInsertRowid);
    its.forEach((x) => { run('INSERT INTO sale_items(sale_id,product_id,qty,price,cost) VALUES(?,?,?,?,?)', sid, x.p.id, x.q, x.p.sell, x.p.buy); run('UPDATE products SET stock=stock-? WHERE id=?', x.q, x.p.id); });
    if (cust && total > paid) run('UPDATE customers SET due=due+? WHERE id=?', total - paid, cust);
  };
  if (prods.length) {
    const plan = [[6, 1, [[0, 10], [4, 2]], 1], [6, -1, [[8, 3]], 1], [5, 2, [[4, 5], [6, 2]], 0.6], [4, 1, [[5, 3], [9, 4]], 0.5], [3, -1, [[2, 6], [8, 5]], 1], [2, 2, [[0, 20]], 1], [1, 3, [[4, 4], [5, 2]], 0.4], [0, 2, [[4, 3], [8, 2]], 1], [0, 1, [[1, 2], [11, 1]], 0.5]];
    plan.forEach(([d, ci, items, ratio], k) => {
      const its = items.map(([pi, q]) => { const p = prods[pi % prods.length]; return { p, q: build && p.unit === 'kg' ? q * 50 : p.sell > 5000 ? Math.max(1, Math.ceil(q / 4)) : q }; }); // steel by the kilo, big items fewer
      const merged = []; its.forEach((x) => { const m = merged.find((y) => y.p.id === x.p.id); if (m) m.q += x.q; else merged.push(x); });
      sale(d, ci >= 0 ? custs[ci] : null, merged, ratio, k);
    });
    // One purchase bill, half paid; the vendor's due matches it.
    const pp = prods[4 % prods.length], ptot = pp.buy * 20, ppaid = Math.round(ptot / 2);
    run('INSERT INTO purchases(business_id,date,vendor_id,product_id,qty,rate,total,paid) VALUES(?,?,?,?,?,?,?,?)', bid, addDays(today(), -9), v1, pp.id, 20, pp.buy, ptot, ppaid);
    run('UPDATE vendors SET due=? WHERE id=?', ptot - ppaid, v1);
  }
  // Bike / car shops: vehicles with papers, bought on different days; some already sold.
  if (SAMPLE_VEHICLES[type]) {
    const { addVehicle } = require('./vehicles');
    const biz = get('SELECT * FROM businesses WHERE id=?', bid);
    for (const v of SAMPLE_VEHICLES[type]) {
      const pid = addVehicle(biz, { ...v, cat: type, buyDate: addDays(today(), -v.bought) });
      if (v.sold !== undefined) sale(v.sold, custs[v.cust], [{ p: get('SELECT * FROM products WHERE id=?', pid), q: 1 }], 0.9, null);
    }
  }
  const tnote = { agri: 'ট্রাক ভাড়া — সার আনা', build: 'ট্রাক ভাড়া — রড আনা', brick: 'কয়লা আনার ট্রাক ভাড়া' }[type] || 'মাল আনার ভ্যান ভাড়া';
  [['tea', 300, ''], ['transport', 1200, tnote], ['power', 450, ''], ['salary', 1000, 'দৈনিক মজুরি']].forEach(([t, a, n], i) => run('INSERT INTO expenses(business_id,date,type,amount,note) VALUES(?,?,?,?,?)', bid, addDays(today(), -(6 - i)), t, a, n));
}
