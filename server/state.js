'use strict';
// Builds the JSON the browser works with. Shapes match the front-end views.
const { get, all, today } = require('./db');
const { subState, isLocked, plansFor } = require('./core');

const subOf = (b, withPayments) => ({
  plan: b.plan, status: b.status, start: b.sub_start, expiry: b.expiry, state: subState(b),
  payments: withPayments ? all('SELECT date,plan,qty,amount,method,ref FROM sub_payments WHERE business_id=? ORDER BY id', b.id) : [],
});

function bizState(bid, viewer) {
  const b = get('SELECT * FROM businesses WHERE id=?', bid);
  if (!b) return null;
  const admin = get("SELECT id,name,phone FROM users WHERE business_id=? AND role='admin'", bid) || { name: b.owner, phone: b.phone };
  const isAdmin = viewer.role === 'admin';
  const base = {
    id: b.id, name: b.name, owner: b.owner, place: b.place, phone: b.phone, slug: b.slug,
    cats: JSON.parse(b.cats), modules: JSON.parse(b.modules), sub: subOf(b, isAdmin), plans: plansFor(b), demo: !!b.demo, btype: b.btype || 'agri',
    admin: { name: admin.name, phone: admin.phone }, locked: isLocked(b), today: today(),
  };
  const notes = isAdmin ? all('SELECT id,date d,text_bn,text_en,read FROM notifications WHERE business_id=? ORDER BY id DESC LIMIT 40', bid)
    .map((n) => ({ id: n.id, d: n.d, text: { bn: n.text_bn, en: n.text_en }, read: !!n.read })) : [];
  if (base.locked) return { ...base, notes, products: [], customers: [], vendors: [], sales: [], purchases: [], expenses: [], collections: [], vpay: [], sellers: [], opening: 0 };

  const products = all('SELECT id,name,cat,unit,buy,sell,stock,min_stock,box FROM products WHERE business_id=? AND active=1 ORDER BY id', bid)
    .map((p) => { const o = { id: p.id, name: p.name, cat: p.cat, unit: p.unit, sell: p.sell, stock: p.stock, min: p.min_stock, box: p.box }; if (isAdmin) o.buy = p.buy; return o; });
  const customers = all('SELECT id,name,village,phone,due FROM customers WHERE business_id=? ORDER BY name', bid);
  const saleRows = isAdmin
    ? all('SELECT * FROM sales WHERE business_id=? AND void=0 ORDER BY id', bid)
    : all('SELECT * FROM sales WHERE business_id=? AND void=0 AND seller_user_id=? ORDER BY id', bid, viewer.id);
  const itemRows = all(`SELECT si.* FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.business_id=? AND s.void=0 ${isAdmin ? '' : 'AND s.seller_user_id=?'}`, ...(isAdmin ? [bid] : [bid, viewer.id]));
  const items = new Map();
  for (const it of itemRows) { if (!items.has(it.sale_id)) items.set(it.sale_id, []); const o = { pid: it.product_id, qty: it.qty, price: it.price }; if (isAdmin) o.cost = it.cost; items.get(it.sale_id).push(o); }
  const sales = saleRows.map((s) => ({ id: s.memo_no, sid: s.id, date: s.date, cust: s.customer_id || 0, items: items.get(s.id) || [], total: s.total, paid: s.paid, seller: s.seller_label }));
  const sellers = all("SELECT id,name,phone,seller_code FROM users WHERE business_id=? AND role='seller' AND active=1 ORDER BY seller_code", bid)
    .map((u) => ({ id: u.seller_code, uid: u.id, name: u.name, phone: u.phone }));

  if (!isAdmin) {
    // Sellers never receive cost prices, vendors, expenses or the cash position.
    const me = sellers.find((s) => s.uid === viewer.id);
    return { ...base, notes, products, customers, sales, sellers: me ? [me] : [], me, vendors: [], purchases: [], expenses: [], collections: [], vpay: [], opening: 0 };
  }
  return {
    ...base, notes, products, customers, sales, sellers, opening: b.opening,
    vendors: all('SELECT id,name,phone,due FROM vendors WHERE business_id=? ORDER BY name', bid),
    purchases: all('SELECT id,date,vendor_id vendor,product_id pid,qty,rate,total,paid FROM purchases WHERE business_id=? ORDER BY id', bid)
      .map((p) => ({ id: p.id, date: p.date, vendor: p.vendor, items: [{ pid: p.pid, qty: p.qty, price: p.rate }], total: p.total, paid: p.paid })),
    expenses: all('SELECT date,type,amount,note FROM expenses WHERE business_id=? ORDER BY id', bid),
    collections: all('SELECT date,customer_id cust,amount FROM collections WHERE business_id=? ORDER BY id', bid),
    vpay: all('SELECT date,vendor_id vendor,amount FROM vendor_payments WHERE business_id=? ORDER BY id', bid),
  };
}

function bizSummary(b) {
  const month = today().slice(0, 7);
  const s = get('SELECT COALESCE(SUM(total),0) sales, COUNT(*) n FROM sales WHERE business_id=? AND void=0', b.id);
  const cogs = get('SELECT COALESCE(SUM(si.qty*si.cost),0) c FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.business_id=? AND s.void=0', b.id).c;
  const exp = get('SELECT COALESCE(SUM(amount),0) e FROM expenses WHERE business_id=?', b.id).e;
  const ms = get("SELECT COALESCE(SUM(total),0) sales, COUNT(*) n FROM sales WHERE business_id=? AND void=0 AND substr(date,1,7)=?", b.id, month);
  const mcogs = get("SELECT COALESCE(SUM(si.qty*si.cost),0) c FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.business_id=? AND s.void=0 AND substr(s.date,1,7)=?", b.id, month).c;
  const mexp = get("SELECT COALESCE(SUM(amount),0) e FROM expenses WHERE business_id=? AND substr(date,1,7)=?", b.id, month).e;
  const admin = get("SELECT id,name,phone FROM users WHERE business_id=? AND role='admin'", b.id) || {};
  return {
    id: b.id, name: b.name, owner: b.owner, place: b.place, phone: b.phone, slug: b.slug,
    cats: JSON.parse(b.cats), modules: JSON.parse(b.modules), sub: subOf(b, true), prices: plansFor(b), demo: !!b.demo, btype: b.btype || 'agri',
    admin, sellers: all("SELECT id uid,seller_code id,name,phone FROM users WHERE business_id=? AND role='seller' AND active=1 ORDER BY seller_code", b.id),
    hasBackup: !!get('SELECT 1 x FROM backups WHERE business_id=?', b.id),
    stats: {
      sales: s.sales, count: s.n, net: s.sales - cogs - exp,
      recv: get('SELECT COALESCE(SUM(due),0) d FROM customers WHERE business_id=?', b.id).d,
      stockVal: get('SELECT COALESCE(SUM(stock*buy),0) v FROM products WHERE business_id=? AND active=1', b.id).v,
      month: { sales: ms.sales, count: ms.n, profit: ms.sales - mcogs - mexp },
    },
  };
}

module.exports = { bizState, bizSummary };
