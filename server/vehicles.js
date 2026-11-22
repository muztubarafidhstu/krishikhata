'use strict';
// Bike and car shops: every vehicle is one unique item with its papers.
// Adding a vehicle = a product (stock 1) + a purchase dated on the buying day (from the previous owner or a dealer).
// Selling it is a normal sale; that sale's date is the selling date.
const { get, run, tx, today } = require('./db');
const { fail, money, str } = require('./core');
const { normPhone, validPhone } = require('./security');

const VEHICLE_CATS = ['bike', 'car'];
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z'));

// Reads and checks the form. biz = the shop row.
function vehicleInput(b, biz) {
  const cat = b.cat === 'car' ? 'car' : 'bike';
  if (!JSON.parse(biz.cats).includes(cat)) fail(400, 'ক্যাটাগরি বাছাই করুন', 'Choose a category');
  // Cars: second-hand only. Bikes: what the shop was set up for (new / used), or the owner's choice when it sells both.
  const cond = cat === 'car' ? 'old' : ['new', 'old'].includes(biz.vcond) ? biz.vcond : b.cond === 'new' ? 'new' : 'old';
  const m = {
    cond, brand: str(b.brand, 40), model: str(b.model, 60), year: str(b.year, 4), engine: str(b.engine, 40).toUpperCase(), chassis: str(b.chassis, 40).toUpperCase(),
    color: str(b.color, 30), cc: str(b.cc, 8), regNo: str(b.regNo, 40), regDate: str(b.regDate, 10), buyDate: str(b.buyDate, 10) || today(),
    ownerName: cond === 'old' ? str(b.ownerName, 60) : '', ownerPhone: cond === 'old' && b.ownerPhone ? normPhone(b.ownerPhone) : '',
    dealer: cond === 'new' ? str(b.dealer, 80) : '',
  };
  if (!m.model) fail(400, 'মডেলের নাম লিখুন', 'Enter the model');
  if (m.year && !/^(19[5-9]\d|20\d\d)$/.test(m.year)) fail(400, 'তৈরির সাল ৪ সংখ্যায় লিখুন (যেমন 2019)', 'Enter the year as 4 digits (e.g. 2019)');
  if (m.cc && !/^\d{2,5}$/.test(m.cc)) fail(400, 'সিসি শুধু সংখ্যায় লিখুন (যেমন 150)', 'Enter CC as a number (e.g. 150)');
  if (!isDate(m.buyDate) || m.buyDate > today()) fail(400, 'কেনার তারিখ ঠিক করুন (আজ বা আগের তারিখ)', 'Fix the buying date (today or earlier)');
  if (m.regDate && !isDate(m.regDate)) fail(400, 'রেজিস্ট্রেশনের তারিখ ঠিক করুন', 'Fix the registration date');
  if (m.ownerPhone && !validPhone(m.ownerPhone)) fail(400, 'আগের মালিকের সঠিক মোবাইল নম্বর দিন', 'Enter a valid mobile number for the previous owner');
  const name = str(b.name, 80) || str([m.brand, m.model].filter(Boolean).join(' ') + (m.year || m.color ? ` (${[m.year, m.color].filter(Boolean).join(', ')})` : ''), 80);
  return {
    cat, m, name,
    buy: money(b.buy, { name: 'cost' }), sell: money(b.sell, { name: 'price' }),
    paid: b.paid === '' || b.paid === null || b.paid === undefined ? null : money(b.paid, { name: 'paid' }),
    box: str(b.box, 20),
  };
}

// The same engine or chassis number can't be in stock twice in one shop.
function checkDuplicate(bid, m, exceptId) {
  for (const [k, label] of [['engine', ['ইঞ্জিন', 'engine']], ['chassis', ['চেসিস', 'chassis']]]) {
    if (!m[k]) continue;
    const dup = get(`SELECT id,name FROM products WHERE business_id=? AND active=1 AND stock>0 AND id<>? AND json_extract(meta,'$.${k}')=?`, bid, exceptId || 0, m[k]);
    if (dup) fail(409, `এই ${label[0]} নম্বর আগে থেকেই স্টকে আছে: ${dup.name}`, `This ${label[1]} number is already in stock: ${dup.name}`);
  }
}

// Previous owner (old) or dealer (new) becomes the vendor of the purchase.
function sellerVendor(bid, m) {
  if (m.cond === 'old') {
    if (m.ownerPhone) {
      const v = get('SELECT id FROM vendors WHERE business_id=? AND phone=?', bid, m.ownerPhone);
      if (v) return v.id;
    }
    const nm = m.ownerName || 'ব্যক্তিগত বিক্রেতা';
    return Number(run('INSERT INTO vendors(business_id,name,phone,due) VALUES(?,?,?,0)', bid, nm, m.ownerPhone || '').lastInsertRowid);
  }
  const nm = m.dealer || 'শোরুম / ডিলার';
  const v = get('SELECT id FROM vendors WHERE business_id=? AND name=?', bid, nm);
  return v ? v.id : Number(run('INSERT INTO vendors(business_id,name,phone,due) VALUES(?,?,?,0)', bid, nm, '').lastInsertRowid);
}

function addVehicle(biz, body) {
  const f = vehicleInput(body, biz);
  return tx(() => {
    checkDuplicate(biz.id, f.m);
    const n = (get('SELECT COUNT(*) n FROM products WHERE business_id=?', biz.id).n || 0) + 1;
    const pid = Number(run('INSERT INTO products(business_id,name,cat,unit,buy,sell,stock,min_stock,box,brand,size,dims,weight,per_pack,meta) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      biz.id, f.name, f.cat, 'piece', f.buy, f.sell, 1, 0, f.box || 'V-' + String(n).padStart(2, '0'), f.m.brand, f.m.cc ? f.m.cc + ' cc' : '', '', null, null, JSON.stringify(f.m)).lastInsertRowid);
    const vid = sellerVendor(biz.id, f.m);
    const paid = f.paid === null ? f.buy : Math.min(f.paid, f.buy);
    run('INSERT INTO purchases(business_id,date,vendor_id,product_id,qty,rate,total,paid) VALUES(?,?,?,?,?,?,?,?)', biz.id, f.m.buyDate, vid, pid, 1, f.buy, f.buy, paid);
    if (f.buy > paid) run('UPDATE vendors SET due=due+? WHERE id=?', f.buy - paid, vid);
    return pid;
  });
}

// Edit the papers and prices. The buying date also moves the purchase to that day.
function updateVehicle(biz, id, body) {
  const p = get('SELECT * FROM products WHERE id=? AND business_id=? AND active=1', Number(id), biz.id) || fail(404, 'পাওয়া যায়নি', 'Not found');
  if (!VEHICLE_CATS.includes(p.cat)) fail(400, 'এটি গাড়ি নয়', 'This is not a vehicle');
  const f = vehicleInput({ ...body, cat: p.cat }, biz);
  tx(() => {
    checkDuplicate(biz.id, f.m, p.id);
    run('UPDATE products SET name=?,buy=?,sell=?,box=?,brand=?,size=?,meta=? WHERE id=?', f.name, f.buy, f.sell, f.box || p.box, f.m.brand, f.m.cc ? f.m.cc + ' cc' : '', JSON.stringify(f.m), p.id);
    run('UPDATE purchases SET date=? WHERE product_id=? AND business_id=? AND qty=1 AND void=0', f.m.buyDate, p.id, biz.id);
  });
}

module.exports = { VEHICLE_CATS, addVehicle, updateVehicle };
