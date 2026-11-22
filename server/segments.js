'use strict';
// The business segments (products) sold from this one server.
// Each has its own mother panel (adminN.<domain>), sales page (/appN), Android app and colours.
// The order fixes the numbers: 1 = KrishiKhata (/app1, admin1), 2 = NirmanKhata (/app2, admin2) …
const SEGMENTS = [
  {
    key: 'agri', fresh: ['newkrishi', '01900000020'], tagline: 'কোন কৃষকের কত বাকি, কোন সার কত বস্তা আছে, মাস শেষে কত লাভ — এক চাপে দেখুন।',
    feats: [['🧾', 'ক্যাশ মেমো', 'PDF, ছবি ও প্রিন্ট'], ['📦', 'স্টক হিসাব', 'কম হলে সতর্কতা'], ['💰', 'কৃষকের বাকি', 'মোবাইল নম্বরে খুঁজুন'], ['📈', 'লাভ-ক্ষতি', 'মাস ও বছর অনুযায়ী'], ['👥', '৩ জন সেলার', 'আলাদা আইডি'], ['🌐', 'নিজস্ব ওয়েবসাইট', 'কৃষকরা দাম দেখবে']],
    emoji: '🌾', num: 1, bn: 'কৃষিখাতা', en: 'KrishiKhata', what: { bn: 'বীজ · সার · কীটনাশক', en: 'Seed · Fertilizer · Pesticide' },
    cats: ['seed', 'fert', 'pest'], monthly: 500, legacyAdmin: 'adminrafid', legacyPage: '/app', apk: 'krishikhata.apk', pkg: 'com.rafid5.krishikhata',
    color: '#2f8f3a', dark: '#1f6b2a', demo: ['demoshop', '01900000000'], icon: 'leaf',
  },
  {
    key: 'build', fresh: ['newnirman', '01900000022'], tagline: 'রড কেজি বা টনে, সিমেন্ট বস্তায়, টিন পিস লিখলেই বান্ডিল — ঠিকাদারের বাকিসহ সব হিসাব।',
    feats: [['🏗️', 'রড', 'কেজি বা টন হিসাবে'], ['🧱', 'সিমেন্ট', 'কোম্পানি অনুযায়ী'], ['📐', 'টিন', 'পিস লিখলে বান্ডিল নিজে'], ['👷', 'ঠিকাদারের বাকি', 'মোবাইল নম্বরে খুঁজুন'], ['🧾', 'ক্যাশ মেমো', 'PDF ও প্রিন্ট'], ['📈', 'লাভ-ক্ষতি', 'মাস ও বছর অনুযায়ী']],
    emoji: '🏗️', num: 2, bn: 'নির্মাণখাতা', en: 'NirmanKhata', what: { bn: 'রড · সিমেন্ট · টিন · শিট · অ্যাঙ্গেল · বার', en: 'Rod · Cement · Tin · Sheet · Angle · Bar' },
    cats: ['rod', 'cement', 'tin', 'sheet', 'angle', 'bar', 'other'], monthly: 700, legacyAdmin: 'adminnirman', legacyPage: '/nirman', apk: 'nirmankhata.apk', pkg: 'com.rafid5.nirmankhata',
    color: '#a8532b', dark: '#7a3b1d', demo: ['demosteel', '01900000002'], icon: 'build',
  },
  {
    key: 'bike', fresh: ['newbike', '01900000024'], tagline: 'প্রতিটি বাইকের ইঞ্জিন/চেসিস নম্বর, আগের মালিক, কেনা-বেচার তারিখ আর লাভ — এক জায়গায়।', emoji: '🏍️', num: 3, bn: 'বাইকখাতা', en: 'BikeKhata', what: { bn: 'নতুন ও পুরাতন মোটরসাইকেল', en: 'New & second-hand motorcycles' },
    cats: ['bike', 'parts'], monthly: 799, apk: 'bikekhata.apk', pkg: 'com.rafid5.bikekhata',
    color: '#c2410c', dark: '#9a3412', demo: ['demobike', '01900000004'], icon: 'bike',
    pains: ['কোন বাইক কবে কিনলেন, কার কাছ থেকে — মনে থাকে না?', 'ইঞ্জিন/চেসিস নম্বর খুঁজতে খাতা উল্টাতে হয়?', 'কোন বাইকে কত লাভ হলো — হিসাব মেলে না?'],
    feats: [['🏍️', 'নতুন ও পুরাতন বাইক', 'মডেল, সাল, সিসি, রং'], ['🔎', 'ইঞ্জিন/চেসিস নম্বর', 'এক সেকেন্ডে খুঁজুন'], ['📅', 'কেনা ও বিক্রির তারিখ', 'মাস অনুযায়ী রিপোর্ট'], ['👤', 'আগের মালিক', 'নাম ও মোবাইল নম্বর'], ['💰', 'প্রতি বাইকে লাভ', 'নিজে হিসাব'], ['🧾', 'বিক্রির মেমো', 'PDF ও প্রিন্ট']],
  },
  {
    key: 'brick', fresh: ['newbrick', '01900000026'], tagline: 'কোন ঠিকাদার কত হাজার ইট নিল, কত অগ্রিম দিল, কোন ইট কত আছে — সব হিসাব মোবাইলে।', emoji: '🧱', num: 4, bn: 'ইটখাতা', en: 'ItKhata', what: { bn: 'ইট · খোয়া · ব্লক · বালু', en: 'Brick · Khoa · Block · Sand' },
    cats: ['brick', 'khoa', 'block', 'other'], monthly: 699, apk: 'itkhata.apk', pkg: 'com.rafid5.itkhata',
    color: '#b91c1c', dark: '#7f1d1d', demo: ['demobrick', '01900000006'], icon: 'brick',
    pains: ['কোন ঠিকাদার কত হাজার ইট নিল — খাতায় হারায়?', 'অগ্রিম টাকা আর বাকি মেলাতে ঝামেলা?', 'কোন শ্রেণির ইট কত আছে — গুনে দেখতে হয়?'],
    feats: [['🧱', 'ইট হাজার হিসাবে', '১ম, ২য় শ্রেণি, পিকেট'], ['🚚', 'ট্রাক/সিএফটি', 'খোয়া ও বালু'], ['👷', 'ঠিকাদারের বাকি', 'মোবাইল নম্বরে খুঁজুন'], ['📦', 'স্টক হিসাব', 'কম হলে সতর্কতা'], ['🧾', 'ক্যাশ মেমো', 'PDF ও প্রিন্ট'], ['📈', 'লাভ-ক্ষতি', 'মাস ও বছর অনুযায়ী']],
  },
  {
    key: 'mobile', fresh: ['newmobile', '01900000028'], tagline: 'মোবাইল, এক্সেসরিজ আর ইলেকট্রনিক্সের স্টক, বিক্রি ও বাকি — এক অ্যাপে।', emoji: '📱', num: 5, bn: 'মোবাইলখাতা', en: 'MobileKhata', what: { bn: 'মোবাইল · এক্সেসরিজ · ইলেকট্রনিক্স', en: 'Mobile · Accessories · Electronics' },
    cats: ['phone', 'accessory', 'electronics', 'other'], monthly: 699, apk: 'mobilekhata.apk', pkg: 'com.rafid5.mobilekhata',
    color: '#6d28d9', dark: '#4c1d95', demo: ['demomobile', '01900000008'], icon: 'phone',
    pains: ['কোন মডেল কত পিস আছে — মনে রাখা কঠিন?', 'চার্জার-কভারের ছোট বিক্রি হিসাবে আসে না?', 'বাকিতে দেওয়া ফোনের টাকা আদায় হয় না?'],
    feats: [['📱', 'মোবাইল ফোন', 'ব্র্যান্ড ও মডেল'], ['🎧', 'এক্সেসরিজ', 'চার্জার, কভার, হেডফোন'], ['📺', 'ইলেকট্রনিক্স', 'টিভি, ফ্যান ও আরও'], ['🔎', 'মডেল দিয়ে খুঁজুন', 'নাম বা আইডি লিখলেই'], ['💰', 'বাকি ও জমা', 'মোবাইল নম্বরে খুঁজুন'], ['📈', 'লাভ-ক্ষতি', 'মাস ও বছর অনুযায়ী']],
  },
  {
    key: 'furniture', fresh: ['newfurniture', '01900000030'], tagline: 'খাট-সোফা-আলমারির স্টক, অগ্রিম ও বাকি — খরচ বাদে আসল লাভ দেখুন।', emoji: '🛋️', num: 6, bn: 'ফার্নিচারখাতা', en: 'FurnitureKhata', what: { bn: 'খাট · সোফা · টেবিল · আলমারি · দরজা', en: 'Bed · Sofa · Table · Almirah · Door' },
    cats: ['bed', 'sofa', 'table', 'almirah', 'door', 'other'], monthly: 699, apk: 'furniturekhata.apk', pkg: 'com.rafid5.furniturekhata',
    color: '#0f766e', dark: '#134e4a', demo: ['demofurniture', '01900000010'], icon: 'sofa',
    pains: ['কোন অর্ডারে কত অগ্রিম নিলেন — মনে থাকে না?', 'শোরুমে কোন খাট-সোফা কয়টা আছে?', 'কাঠ-মিস্ত্রির খরচ বাদে আসল লাভ কত?'],
    feats: [['🛏️', 'খাট ও সোফা', 'মডেল অনুযায়ী স্টক'], ['🪑', 'টেবিল-চেয়ার', 'সেট বা পিস'], ['🚪', 'দরজা-আলমারি', 'সব এক জায়গায়'], ['💰', 'অগ্রিম ও বাকি', 'ক্রেতার নামে'], ['🧾', 'ক্যাশ মেমো', 'PDF ও প্রিন্ট'], ['📈', 'লাভ-ক্ষতি', 'খরচ বাদ দিয়ে']],
  },
  {
    key: 'car', fresh: ['newcar', '01900000032'], tagline: 'প্রতিটি গাড়ির কাগজপত্র, আগের মালিক, কেনা-বেচার তারিখ আর লাভ — এক চাপে খুঁজে পান।', emoji: '🚗', num: 7, bn: 'গাড়িখাতা', en: 'GariKhata', what: { bn: 'পুরাতন গাড়ি কেনা-বেচা', en: 'Used car trading' },
    cats: ['car', 'parts'], monthly: 799, apk: 'garikhata.apk', pkg: 'com.rafid5.garikhata',
    color: '#1d4ed8', dark: '#1e3a8a', demo: ['democar', '01900000012'], icon: 'car',
    pains: ['কোন গাড়ি কবে কিনলেন, কার কাছ থেকে — মনে থাকে না?', 'ইঞ্জিন/চেসিস নম্বর খুঁজতে কাগজ ঘাঁটতে হয়?', 'কোন গাড়িতে কত লাভ হলো?'],
    feats: [['🚗', 'পুরাতন গাড়ি', 'মডেল, সাল, সিসি, রং'], ['🔎', 'ইঞ্জিন/চেসিস নম্বর', 'এক সেকেন্ডে খুঁজুন'], ['📅', 'কেনা ও বিক্রির তারিখ', 'মাস অনুযায়ী রিপোর্ট'], ['👤', 'আগের মালিক', 'নাম ও মোবাইল নম্বর'], ['💰', 'প্রতি গাড়িতে লাভ', 'নিজে হিসাব'], ['🧾', 'বিক্রির মেমো', 'PDF ও প্রিন্ট']],
  },
  {
    key: 'hardware', fresh: ['newhardware', '01900000034'], tagline: 'হাজার রকম পাইপ-ফিটিংস-স্যানিটারির স্টক আর মিস্ত্রির বাকি — সহজে, বাংলায়।', emoji: '🔧', num: 8, bn: 'হার্ডওয়্যারখাতা', en: 'HardwareKhata', what: { bn: 'পাইপ · ফিটিংস · স্যানিটারি · টাইলস · রং · ইলেকট্রিক', en: 'Pipe · Fittings · Sanitary · Tiles · Paint · Electric' },
    cats: ['pipe', 'fitting', 'sanitary', 'tiles', 'paint', 'electric', 'tools', 'other'], monthly: 699, apk: 'hardwarekhata.apk', pkg: 'com.rafid5.hardwarekhata',
    color: '#0e7490', dark: '#155e75', demo: ['demohardware', '01900000014'], icon: 'wrench',
    pains: ['হাজার রকম ছোট মালের স্টক — মনে রাখা অসম্ভব?', 'মিস্ত্রি-ঠিকাদারের বাকি খাতায় হারায়?', 'কোন মালে লাভ বেশি — জানা হয় না?'],
    feats: [['🔧', 'পাইপ ও ফিটিংস', 'সাইজ অনুযায়ী'], ['🚿', 'স্যানিটারি ও টাইলস', 'বক্স বা পিস'], ['🎨', 'রং ও ইলেকট্রিক', 'লিটার, মিটার, পিস'], ['👷', 'মিস্ত্রির বাকি', 'মোবাইল নম্বরে খুঁজুন'], ['🧾', 'ক্যাশ মেমো', 'PDF ও প্রিন্ট'], ['📈', 'লাভ-ক্ষতি', 'কোন মালে কত লাভ']],
  },
];
const SEG = Object.fromEntries(SEGMENTS.map((s) => [s.key, s]));
const segByNum = (n) => SEGMENTS.find((s) => s.num === Number(n));
// demo  = the full demo shop (sample sales, customers, dues …), public at rafid5.com/demoN.
// fresh = the 'brand-new shop' demo (only the starter products), listed only at demo.<domain>.
// Shops that sell one unique item at a time with its papers (engine/chassis number, owner, dates).
const VEHICLE = { bike: 'bike', car: 'car' };

module.exports = { SEGMENTS, SEG, segByNum, VEHICLE };
