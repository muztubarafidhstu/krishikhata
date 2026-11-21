# কৃষিখাতা — KrishiKhata

বীজ, সার ও কীটনাশক ব্যবসার জন্য সাবস্ক্রিপশন-ভিত্তিক হিসাবের ওয়েবসাইট। একটি "মাদার প্যানেল" থেকে অনেক দোকান সেটআপ ও নিয়ন্ত্রণ করা যায়।

A subscription-based business manager for seed, fertilizer and pesticide shops. One "mother panel" sets up and controls many shops.

## What it does

**Super admin (mother panel)**
- Set up a new shop in 6 steps: business info, product types (seed / fertilizer / pesticide), modules, admin + up to 3 seller IDs, plan.
- Subscriptions: monthly / yearly / free trial, record payments (bKash, Nagad, Rocket, cash, bank), pick any expiry on a calendar, deactivate. Expired or deactivated shops are locked on the server; data is kept.
- Find anyone by mobile number; view (audited) or reset passwords; reset a shop's data with one restorable backup.
- **OTP switch**: turn SMS OTP on or off for the whole system.
- SMS log and gateway status; this month's sales and profit per owner.

**Shop owner (admin)**
- Dashboard: sales, net profit, cash, stock value, dues, 7-day chart, low stock, search by mobile number.
- New sale with product search (name, ID, box number) and category filter, customer lookup by phone, invoice as PDF / PNG / print.
- Stock, product catalog (edit prices, box/rack numbers), purchases & vendor bills, customer and vendor dues, expenses, profit & loss, balance sheet.
- Sellers (max 3), password changes, cancel a wrong memo, notifications for subscription expiry and renewal, public product page for farmers at `/shop/<name>`.

**Seller** — enters sales only, at the owner's prices; sees only their own sales; never sees cost prices or profit.

Bangla / English switch, light / dark theme, works on phones ("Add to Home screen").

## Tech

- Node.js 22 + Express, SQLite (built into Node — no database server to manage), plain JavaScript front end.
- Passwords: scrypt hashes for login + AES-256-GCM encrypted copy so the super admin can view them (owner's requirement; every view is audited).
- Sessions in HttpOnly cookies, CSRF header check, login rate limits, strict Content-Security-Policy.
- Nightly database backups (30 days) in `data/backups/`.
- Docker Compose with Caddy for automatic HTTPS.
- `esp32/sms_gateway/` — firmware for an ESP32 + SIM800L SMS gateway.

## Run locally

```bash
npm install
```

```bash
SUPER_PHONE=01700000000 SUPER_PASSWORD='Super@1' npm run seed-demo
```

```bash
SUPER_PHONE=01700000000 SUPER_PASSWORD='Super@1' npm start
```

Open http://localhost:3000 — demo logins: `01700000000 / Super@1` (super), `01711100001 / Rahim@12` (owner), `01811200001 / Jamal#1` (seller). Do not run `seed-demo` on the real server.

Tests: `npm test`

## Put it online

Step-by-step guide (Bangla): **[docs/DEPLOY.md](docs/DEPLOY.md)**
SMS gateway: **[docs/ESP32.md](docs/ESP32.md)**

## Project layout

```
server/            API, database, jobs (reminders, backups)
  routes/          auth, super admin, shop, SMS gateway
public/            the website (index.html, app.css, js/)
esp32/             SMS gateway firmware
docs/              deployment and hardware guides
test/smoke.js      end-to-end API test
```
