'use strict';
const { get, run, tx, today, addMonths, addDays } = require('./db');
const { hashPassword, encrypt, normPhone } = require('./security');
const { STARTER, plans } = require('./core');

function slugify(name, id) {
  const base = String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  let slug = base || 'shop' + id;
  let i = 2;
  while (get('SELECT 1 x FROM businesses WHERE slug=?', slug)) slug = (base || 'shop' + id) + '-' + i++;
  return slug;
}

// A removed seller's number can be used again: the old (inactive) ID keeps its history under an archived number.
const freePhone = (phone) => run("UPDATE users SET phone='old' || id || '-' || phone WHERE phone=? AND active=0", normPhone(phone));

function addUser({ bid, role, name, phone, password, code }) {
  freePhone(phone);
  return Number(run('INSERT INTO users(business_id,role,name,phone,pass_hash,pass_enc,seller_code) VALUES(?,?,?,?,?,?,?)',
    bid ?? null, role, name, normPhone(phone), hashPassword(password), encrypt(password), code ?? null).lastInsertRowid);
}

/* data: {name, owner, phone, place, licence, opening, cats[], modules[], starter(bool),
          admin:{phone,password}, sellers:[{name,phone,password}], plan, payMethod, payRef} */
function createBusiness(data) {
  return tx(() => {
    const btype = data.btype === 'build' ? 'build' : 'agri';
    const P = plans(btype);
    const t = today();
    const plan = ['trial', 'monthly', 'yearly'].includes(data.plan) ? data.plan : 'trial';
    const expiry = plan === 'trial' ? addDays(t, P.trialDays) : addMonths(t, plan === 'yearly' ? 12 : 1);
    const r = run(`INSERT INTO businesses(name,owner,place,phone,licence,slug,cats,modules,opening,plan,status,sub_start,expiry)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, data.name, data.owner, data.place || '', normPhone(data.phone || data.admin.phone), data.licence || '',
      'tmp-' + Date.now() + Math.random(), JSON.stringify(data.cats), JSON.stringify(data.modules), data.opening || 0, plan, 'on', t, expiry);
    run('UPDATE businesses SET btype=? WHERE id=?', btype, Number(r.lastInsertRowid));
    const bid = Number(r.lastInsertRowid);
    run('UPDATE businesses SET slug=? WHERE id=?', data.slug || slugify(data.slugHint || data.name, bid), bid);
    addUser({ bid, role: 'admin', name: data.owner, phone: data.admin.phone, password: data.admin.password });
    data.sellers.forEach((s, i) => addUser({ bid, role: 'seller', name: s.name, phone: s.phone, password: s.password, code: 'S-0' + (i + 1) }));
    if (data.starter !== false) {
      let n = 1;
      for (const p of STARTER.filter((x) => data.cats.includes(x.cat)))
        run('INSERT INTO products(business_id,name,cat,unit,buy,sell,stock,min_stock,box,brand,size,dims,weight,per_pack) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', bid, p.name, p.cat, p.unit, p.buy, p.sell, 0, p.min, 'B-' + String(n++).padStart(2, '0'), p.brand || '', p.size || '', p.dims || '', p.weight ?? null, p.per_pack ?? null);
    }
    if (plan !== 'trial') run('INSERT INTO sub_payments(business_id,date,plan,qty,amount,method,ref) VALUES(?,?,?,?,?,?,?)', bid, t, plan, 1, plan === 'yearly' ? P.yearly : P.monthly, data.payMethod || 'cash', data.payRef || '');
    return bid;
  });
}

module.exports = { createBusiness, addUser, slugify, freePhone };
