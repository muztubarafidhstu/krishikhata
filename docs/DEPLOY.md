# কৃষিখাতা লাইভ করার ধাপ (Step-by-step: make the website live)

এই গাইড ধরে নিচ্ছে আপনার একটি ডোমেইন আছে (যেমন `krishikhata.com.bd`)। নিচে `example.com` যেখানে আছে, সেখানে আপনার ডোমেইন বসাবেন।
মোট সময়: প্রায় ১ ঘণ্টা। প্রতিটি কমান্ড কপি করে পেস্ট করলেই হবে।

---

## ধাপ ১ — একটি সার্ভার (VPS) ভাড়া নিন

যেকোনো একটি: **DigitalOcean**, **Vultr** বা **Hetzner**।

- Operating system: **Ubuntu 24.04 LTS**
- Region: **Singapore** (বাংলাদেশ থেকে সবচেয়ে দ্রুত)
- Size: **1 vCPU, 2 GB RAM** (প্রায় $10–12/মাস) — কয়েকশো দোকানের জন্য যথেষ্ট
- Authentication: Password (সহজ) অথবা SSH key (বেশি নিরাপদ)
- DigitalOcean-এ **Backups** অপশন চালু রাখুন (অল্প টাকায় সাপ্তাহিক পুরো সার্ভারের কপি)

তৈরি হলে সার্ভারের **IP address** লিখে রাখুন (যেমন `203.0.113.10`)।

## ধাপ ২ — ডোমেইনকে সার্ভারের সাথে যুক্ত করুন (DNS)

যেখান থেকে ডোমেইন কিনেছেন (বা Cloudflare), সেখানে **DNS** সেটিংসে দুটি রেকর্ড যোগ করুন:

| Type | Name | Value |
|---|---|---|
| A | `@` | আপনার সার্ভারের IP |
| A | `*` | আপনার সার্ভারের IP (সব দোকানের নিজস্ব ঠিকানা ও মাদার প্যানেল, যেমন `karim.example.com`) |

Cloudflare ব্যবহার করলে প্রথমে মেঘের চিহ্ন **ধূসর (DNS only)** রাখুন, যাতে HTTPS সার্টিফিকেট নিজে থেকে তৈরি হতে পারে।
DNS ছড়াতে ৫ মিনিট থেকে কয়েক ঘণ্টা লাগতে পারে। যাচাই: কম্পিউটারে `ping example.com` দিলে আপনার সার্ভারের IP দেখাবে।

## ধাপ ৩ — সার্ভারে ঢুকুন

Windows-এ **PowerShell**, Mac-এ **Terminal** খুলে:

```bash
ssh root@203.0.113.10
```

(IP-এর জায়গায় আপনার IP। প্রথমবার `yes` লিখে Enter দিন, তারপর পাসওয়ার্ড।)

## ধাপ ৪ — Docker ও ফায়ারওয়াল চালু করুন

সার্ভারে একটা একটা করে চালান:

```bash
apt update && apt upgrade -y
```

```bash
curl -fsSL https://get.docker.com | sh
```

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

## ধাপ ৫ — GitHub থেকে কোড আনুন

রিপোজিটরি প্রাইভেট, তাই একটি রিড-অনলি টোকেন লাগবে:

1. GitHub → Settings → Developer settings → **Personal access tokens → Fine-grained tokens → Generate new token**
2. Repository access: **Only select repositories → krishikhata**
3. Permissions: **Contents → Read-only** → Generate → টোকেনটি কপি করুন

সার্ভারে:

```bash
git clone https://github.com/muztubarafidhstu/krishikhata.git /opt/krishikhata
```

Username চাইলে আপনার GitHub ইউজারনেম, Password চাইলে **টোকেনটি** পেস্ট করুন (স্ক্রিনে কিছু দেখাবে না, সেটাই স্বাভাবিক)।

```bash
cd /opt/krishikhata
```

## ধাপ ৬ — সেটিংস ফাইল (.env) তৈরি করুন

দুটি গোপন চাবি বানান — আউটপুট কপি করে রাখুন:

```bash
openssl rand -hex 32
```

```bash
openssl rand -hex 16
```

তারপর:

```bash
cp .env.example .env && nano .env
```

যা বসাবেন:

```
DOMAIN=example.com                 ← দোকানের ঠিকানা (https:// ছাড়া)
ADMIN_DOMAIN=adminrafid.example.com ← মাদার প্যানেলের ঠিকানা
BUILD_ADMIN_DOMAIN=adminnirman.example.com ← নির্মাণখাতা (রড-সিমেন্ট) মাদার প্যানেল
SUPER_PHONE=017XXXXXXXX            ← আপনার মোবাইল (সুপার অ্যাডমিন আইডি)
SUPER_PASSWORD=YourPass@1          ← কমপক্ষে ৫ অক্ষর, অক্ষর + সংখ্যা + চিহ্ন
APP_SECRET=...                     ← প্রথম openssl কমান্ডের ৬৪ অক্ষরের মান
GATEWAY_KEY=...                    ← দ্বিতীয় openssl কমান্ডের মান (ESP32-এও লাগবে)
```

সেভ: `Ctrl+O` → Enter → `Ctrl+X`।

> **গুরুত্বপূর্ণ:** `APP_SECRET` কাগজে বা পাসওয়ার্ড ম্যানেজারে আলাদা করে রাখুন এবং কখনো বদলাবেন না। এটা হারালে সুপার অ্যাডমিন আর পুরোনো পাসওয়ার্ড "দেখতে" পারবেন না (লগইন ঠিকই চলবে)।

## ধাপ ৭ — চালু করুন

```bash
docker compose up -d --build
```

২–৩ মিনিট পর লগ দেখুন:

```bash
docker compose logs --tail=30 app
```

`listening on :3000` আর `Super admin created` দেখলে ঠিক আছে। HTTPS সার্টিফিকেটের লগ:

```bash
docker compose logs --tail=30 caddy
```

এখন ব্রাউজারে **https://adminrafid.example.com** খুলুন → আপনার `SUPER_PHONE` ও `SUPER_PASSWORD` দিয়ে লগইন করুন। 🎉
প্রতিটি দোকান সেটআপের সময় নিজের ঠিকানা পায় (যেমন **https://karim.example.com**); সেই দোকানের মালিক ও সেলাররা সেখানে লগইন করবেন। কৃষকদের জন্য পণ্যের পেজ: **https://karim.example.com/shop**। নতুন দোকানের ঠিকানায় প্রথমবার ঢুকলে HTTPS সার্টিফিকেট তৈরি হতে ১০–৩০ সেকেন্ড লাগতে পারে।

## ধাপ ৮ — প্রথম কাজগুলো

1. **সেটিংস ও OTP** → প্ল্যানের দাম (মাসিক/বার্ষিক), ফ্রি ট্রায়ালের দিন, আর বিকাশ/নগদ নম্বর ঠিক করুন।
2. **নতুন সেটআপ** → প্রথম দোকান তৈরি করুন। দোকানের মালিক তার মোবাইল নম্বর আর পাসওয়ার্ড দিয়ে একই ঠিকানায় লগইন করবেন।
3. OTP এখন **বন্ধ** আছে। ESP32 SMS গেটওয়ে চালু করে টেস্ট SMS ঠিকমতো গেলে তবেই OTP চালু করবেন (ধাপ ১০)।

## ধাপ ৯ — ব্যাকআপ (খুব জরুরি)

সিস্টেম প্রতি রাতে নিজে থেকে `/opt/krishikhata/data/backups/` ফোল্ডারে পুরো ডেটাবেসের একটি কপি রাখে (৩০ দিন পর্যন্ত)।
কিন্তু সার্ভার পুরো নষ্ট হলে সেটাও যাবে — তাই **দ্বিতীয় জায়গায়** কপি রাখুন:

- **সহজ উপায়:** VPS প্রোভাইডারের "Backups" অপশন চালু রাখুন (ধাপ ১)।
- **আরও ভালো:** Google Drive-এ প্রতিদিন কপি — `rclone` দিয়ে:

```bash
apt install -y rclone && rclone config
```

(`n` → নাম `gdrive` → storage `drive` → বাকি প্রশ্নে Enter → "Use web browser" প্রশ্নে `n` দিয়ে দেখানো লিংক নিজের কম্পিউটারের ব্রাউজারে খুলে অনুমতি দিন।)
তারপর প্রতিদিন ভোর ৪টায় কপি:

```bash
(crontab -l 2>/dev/null; echo "0 4 * * * rclone copy /opt/krishikhata/data/backups gdrive:krishikhata-backups --max-age 48h") | crontab -
```

মাসে একবার Google Drive-এ গিয়ে দেখুন নতুন ফাইল আসছে কিনা।

**ব্যাকআপ থেকে ফেরত আনা** (প্রয়োজন হলে):

```bash
cd /opt/krishikhata && docker compose stop app
```

```bash
cp data/backups/krishikhata-2026-01-15.db data/krishikhata.db && rm -f data/krishikhata.db-wal data/krishikhata.db-shm
```

```bash
docker compose start app
```

## ধাপ ১০ — ESP32 SMS গেটওয়ে ও OTP

বিস্তারিত: [`docs/ESP32.md`](ESP32.md)। সংক্ষেপে:

1. ESP32 + SIM800L জুড়ুন, সিম কার্ড দিন (প্রিপেইড, ব্যালেন্স রাখুন)।
2. `esp32/sms_gateway/config.example.h` কপি করে `config.h` বানান — WiFi, ডোমেইন ও `GATEWAY_KEY` বসান।
3. Arduino IDE দিয়ে আপলোড করুন।
4. ওয়েবসাইটে **SMS / OTP লগ** পেজে "গেটওয়ে অনলাইন" দেখাবে। **সেটিংস ও OTP → টেস্ট SMS** দিন।
5. SMS ফোনে এলে **OTP চালু করুন**।

> OTP চালু থাকা অবস্থায় গেটওয়ে বন্ধ হয়ে গেলে নতুন আইডি বা পাসওয়ার্ড বদলানো যাবে না। তখন সুপার অ্যাডমিন হিসেবে OTP বন্ধ করে দিন — সুপার অ্যাডমিনের লগইনে কখনো OTP লাগে না।

## ৮টি সফটওয়্যার — ঠিকানাগুলো (একই সার্ভার, একই সুপার অ্যাডমিন লগইন)

| # | সফটওয়্যার | বিজ্ঞাপন ও অ্যাপ ডাউনলোড | মাদার প্যানেল | অ্যাপ (APK) | ফ্রি ডেমো (এক চাপে, লগইন ছাড়া) |
|---|---|---|---|---|---|
| ১ | কৃষিখাতা (বীজ-সার-কীটনাশক) | example.com/app1 | admin1.example.com | krishikhata.apk | example.com/demo1 |
| ২ | নির্মাণখাতা (রড-সিমেন্ট) | example.com/app2 | admin2.example.com | nirmankhata.apk | example.com/demo2 |
| ৩ | বাইকখাতা (নতুন ও পুরাতন বাইক) | example.com/app3 | admin3.example.com | bikekhata.apk | example.com/demo3 |
| ৪ | ইটখাতা (ইট-খোয়া-ব্লক) | example.com/app4 | admin4.example.com | itkhata.apk | example.com/demo4 |
| ৫ | মোবাইলখাতা (মোবাইল-ইলেকট্রনিক্স) | example.com/app5 | admin5.example.com | mobilekhata.apk | example.com/demo5 |
| ৬ | ফার্নিচারখাতা | example.com/app6 | admin6.example.com | furniturekhata.apk | example.com/demo6 |
| ৭ | গাড়িখাতা (পুরাতন গাড়ি) | example.com/app7 | admin7.example.com | garikhata.apk | example.com/demo7 |
| ৮ | হার্ডওয়্যারখাতা (হার্ডওয়্যার-স্যানিটারি) | example.com/app8 | admin8.example.com | hardwarekhata.apk | example.com/demo8 |

- `adminr.example.com` — সুপার অ্যাডমিনের শুরুর পেজ: ৮টি মাদার প্যানেলের লিংক ও সারাংশ (প্রতিটি প্যানেলে আবার পাসওয়ার্ড লাগে)।
- `example.com` (মূল ঠিকানা) সব সফটওয়্যারের তালিকা দেখায়; প্রতিটি পেজে "নিজের দোকানে যান" বক্সে দোকানের নাম বা মোবাইল নম্বর লিখলে নিজের দোকানে চলে যায়।
- আগের ঠিকানাগুলো (`/app`, `/nirman`, `ADMIN_DOMAIN`, `BUILD_ADMIN_DOMAIN`) আগের মতোই কাজ করে।
- যে মাদার প্যানেল থেকে দোকান খোলা হয়, দোকানটি সেই সফটওয়্যারের হয়।
- DNS-এ নতুন কিছু লাগবে না (`*` রেকর্ডটাই যথেষ্ট); প্রথমবার খুললে HTTPS সার্টিফিকেট নিজে তৈরি হয়।

- ফ্রি ডেমো লিংক (`/demo1` … `/demo8`) চাপলে সেই ডেমো দোকান লগইন ছাড়াই খুলে যায় (শুধু "ডেমো" চিহ্নিত দোকানে কাজ করে; ডেমোতে পাসওয়ার্ড/আইডি বদলানো যায় না)।
- এই ৮টি ডেমো দোকান প্রতি রাত ৩টায় নিজে থেকে নতুন নমুনা ডেটায় ফিরে যায়।

ডেমো দোকান তৈরি — একটা কমান্ডেই সব (যেগুলো নেই শুধু সেগুলো তৈরি হয়):
```bash
cd /opt/krishikhata && docker compose exec app npm run demo-all
```
প্রতিটি সফটওয়্যারের দুটো ডেমো তৈরি হয়: সাজানো ডেমো (নমুনা বিক্রি, ক্রেতা, বাকিসহ — `/demo1` … `/demo8`)
আর নতুন দোকান ডেমো (একদম খালি — কোনো পণ্য নেই; `newkrishi`, `newnirman`, `newbike` … )।
এখনই সব ডেমো আগের অবস্থায় ফেরাতে: `docker compose exec app npm run reset-demos`
নতুন দোকান ডেমোর লিংক: `demo.example.com` (কোথাও প্রকাশিত নয়, সার্চ ইঞ্জিনেও আসে না)। এগুলোতে লগইন লাগে — ৮টিতেই একই আইডি `01700000000`, পাসওয়ার্ড `demo` (বদলাতে `.env`-এ `DEMO_LOGIN_PHONE` ও `DEMO_LOGIN_PASSWORD`)।

## আপডেট করা (নতুন ফিচার এলে)

```bash
cd /opt/krishikhata && git pull && docker compose up -d --build
```

ডেটা `data/` ফোল্ডারে থাকে, আপডেটে মুছে যায় না।

## সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| ব্রাউজারে "Not secure" / সার্টিফিকেট এরর | DNS এখনো সার্ভারে পৌঁছায়নি। `ping example.com` দেখুন, কিছুক্ষণ পর `docker compose restart caddy`। Cloudflare-এ মেঘ ধূসর রাখুন। |
| সাইট খুলছে না | `docker compose ps` — দুটো সার্ভিসই `running` কিনা। `docker compose logs app` দেখুন। |
| `Set SUPER_PHONE ... in .env` লেখা | `.env`-এ সুপার অ্যাডমিনের নম্বর/পাসওয়ার্ড ঠিক নেই। ঠিক করে `docker compose up -d`। |
| সুপার অ্যাডমিনের পাসওয়ার্ড ভুলে গেছেন | `docker compose exec app npm run reset-super -- 017XXXXXXXX "New@pass1"` |
| SMS যাচ্ছে না | SMS লগ পেজে গেটওয়ে অনলাইন কিনা দেখুন; সিমে ব্যালেন্স ও নেটওয়ার্ক; ESP32-এর Serial Monitor-এ এরর। |
| সার্ভার ব্যস্ত/ধীর | `docker stats` দিয়ে RAM দেখুন; দরকার হলে VPS বড় করুন (ডেটা থাকে)। |

## নিরাপত্তা চেকলিস্ট

- [ ] `.env` কখনো কাউকে দেবেন না, GitHub-এ তুলবেন না (`.gitignore`-এ আছে)।
- [ ] সার্ভারের root পাসওয়ার্ড শক্ত রাখুন, সম্ভব হলে SSH key ব্যবহার করুন।
- [ ] মাসে একবার `apt update && apt upgrade -y` চালান।
- [ ] ব্যাকআপ যে আসলে কাজ করে তা মাঝে মাঝে পরীক্ষা করুন।
- [ ] "পাসওয়ার্ড দেখুন" ফিচার যতটা সম্ভব কম ব্যবহার করুন — প্রতিবার অডিট লগে লেখা থাকে।
