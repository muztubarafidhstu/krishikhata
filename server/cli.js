'use strict';
// Usage: npm run seed-demo | npm run reset-super -- <phone> <newPassword> | npm run backup
const { get, run, tx, today, addDays, addMonths } = require('./db');
const { hashPassword, encrypt, normPhone, validPhone, passOk } = require('./security');
const { createBusiness } = require('./business');
const jobs = require('./jobs');
const { DEMO_NAME, fillSample, refillDemo } = require('./demo');

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
} else if (cmd === 'reset-demos') {
  // npm run reset-demos → right now: full demos get fresh sample data, 'new shop' demos become empty
  console.log('Reset:', require('./demo').resetDemos().join(', ') || 'no demo shops found');
} else if (cmd === 'demo-all') {
  // npm run demo-all → every software gets a full demo and a 'new shop' demo (only missing ones are made)
  for (const line of require('./demo').createDemoShops()) console.log(line);
  console.log('All demo links: https://demo.' + (process.env.DOMAIN || 'your-domain'));
} else if (cmd === 'refill-demo') {
  // npm run refill-demo -- demosteel   → wipes a DEMO shop and fills it again with fresh sample data
  const b = get('SELECT * FROM businesses WHERE slug=?', String(a1 || ''));
  if (!b) { console.error('No shop with address: ' + a1); process.exit(1); }
  if (!b.demo) { console.error('Only demo shops can be refilled (mark it first: npm run mark-demo -- ' + a1 + ')'); process.exit(1); }
  refillDemo(b, require('./demo').isFresh(b.slug));
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
