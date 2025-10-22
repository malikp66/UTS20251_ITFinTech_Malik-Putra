// seed.js
/* eslint-disable no-console */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI belum disetel");
  process.exit(1);
}

/* =========================================
 * Schemas & Models
 * =======================================*/
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    mfaEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model("User", userSchema);

const productSchema = new mongoose.Schema(
  {
    game: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true, default: "IDR" },
    image: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

const orderItem = {
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
};

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    buyer: {
      name: { type: String },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    items: [orderItem],
    total: { type: Number, required: true },
    status: { type: String, enum: ["waiting_payment", "lunas", "expired"], default: "waiting_payment" },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true }
);
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

const paymentSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    invoiceId: { type: String, required: true, unique: true },
    externalUrl: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "PAID", "EXPIRED"], default: "PENDING" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);
const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

/* =========================================
 * Static Data
 * =======================================*/
const productsSeed = [
  { game: "mobile legends", name: "86 Diamonds", sku: "ML-86", price: 25000, currency: "IDR", active: true },
  { game: "mobile legends", name: "172 Diamonds", sku: "ML-172", price: 48000, currency: "IDR", active: true },
  { game: "mobile legends", name: "257 Diamonds", sku: "ML-257", price: 72000, currency: "IDR", active: true },
  { game: "mobile legends", name: "Twilight Pass", sku: "ML-TWILIGHT", price: 150000, currency: "IDR", active: true },
  { game: "mobile legends", name: "Weekly Diamond Pass", sku: "ML-WEEKLY", price: 27000, currency: "IDR", active: true },
  { game: "pubg mobile", name: "60 UC", sku: "PUBG-60", price: 16000, currency: "IDR", active: true },
  { game: "pubg mobile", name: "325 UC", sku: "PUBG-325", price: 76000, currency: "IDR", active: true },
  { game: "pubg mobile", name: "660 UC", sku: "PUBG-660", price: 150000, currency: "IDR", active: true },
  { game: "pubg mobile", name: "1800 UC", sku: "PUBG-1800", price: 380000, currency: "IDR", active: true },
  { game: "pubg mobile", name: "Google Play Gift Code", sku: "PUBG-GIFT", price: 100000, currency: "IDR", active: true },
  { game: "roblox", name: "80 Robux", sku: "ROBLOX-80", price: 15000, currency: "IDR", active: true },
  { game: "roblox", name: "400 Robux", sku: "ROBLOX-400", price: 70000, currency: "IDR", active: true },
  { game: "roblox", name: "800 Robux", sku: "ROBLOX-800", price: 135000, currency: "IDR", active: true },
  { game: "roblox", name: "1700 Robux", sku: "ROBLOX-1700", price: 270000, currency: "IDR", active: true },
  { game: "roblox", name: "Roblox Premium 450", sku: "ROBLOX-PREMIUM", price: 119000, currency: "IDR", active: true },
];

// Nama Indonesia + domain lokal
const indoFirstNames = [
  "Budi", "Siti", "Andi", "Dewi", "Rizky", "Fitri", "Agus", "Ayu", "Fajar", "Putri",
  "Rina", "Adi", "Wulan", "Yudi", "Nadia", "Hendra", "Lia", "Taufik", "Maya", "Dedi",
];
const indoLastNames = [
  "Saputra", "Pratama", "Wibowo", "Wijaya", "Hidayat", "Kurniawan", "Sari", "Octavia", "Ramadhan", "Gunawan",
  "Permata", "Suryani", "Mahendra", "Kusuma", "Putra", "Prasetyo", "Rahma", "Fauzan", "Nugroho", "Lestari",
];
const emailDomains = ["gmail.com", "yahoo.com"];

/* =========================================
 * Helpers
 * =======================================*/
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uniqueSeq = (() => {
  let i = 1;
  return (prefix = "SEQ") => `${prefix}-${String(i++).padStart(6, "0")}`;
})();

function randomPhone() {
  // Format Indonesia sederhana: 08xxxxxxxxxx
  const len = rand(10, 12); // total digit 11-13
  let s = "08";
  while (s.length < len) s += rand(0, 9);
  return s;
}

function randomName() {
  return `${pick(indoFirstNames)} ${pick(indoLastNames)}`;
}

function randomEmail(name) {
  const base = name.toLowerCase().replace(/\s+/g, ".");
  return `${base}${rand(10, 999)}@${pick(emailDomains)}`;
}

function randomDateBetween(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const d = new Date(rand(start, end));
  // Atur jam aktif 09:00–21:00 WIB
  d.setHours(rand(9, 21), rand(0, 59), rand(0, 59), 0);
  return d;
}

function slugifyInvoiceId(d) {
  // INV-202508-SEQ-000001
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `INV-${yyyy}${mm}-${uniqueSeq("SEQ")}`;
}

function calcTotals(items) {
  return items.reduce((s, it) => s + it.subtotal, 0);
}

/* =========================================
 * Main Seed
 * =======================================*/
async function seed() {
  await mongoose.connect(uri);
  console.log("Connected. Menghapus semua koleksi lama...");

  await Promise.all([
    // mongoose.connection.collection("users").deleteMany({}),
    mongoose.connection.collection("products").deleteMany({}),
    mongoose.connection.collection("orders").deleteMany({}),
    mongoose.connection.collection("payments").deleteMany({})
  ]);

  console.log("Semua koleksi berhasil dikosongkan kecuali users ✅");

  // Lanjut insert data baru
  const productDocs = await Product.insertMany(productsSeed);
  console.log(`Inserted products: ${productDocs.length}`);

  // Insert users (1 admin + 15 customers)
  const adminPassword = await bcrypt.hash("Admin12345", 10);
  const admin = {
    name: "Admin Utama",
    email: "admin@gmail.com",
    phone: "085117726707",
    passwordHash: adminPassword,
    role: "admin",
  };

  const customers = [];
  const usedEmail = new Set([admin.email]);
  const usedPhone = new Set([admin.phone]);
  for (let i = 0; i < 15; i++) {
    const nm = randomName();
    let email = randomEmail(nm);
    while (usedEmail.has(email)) email = randomEmail(nm);
    usedEmail.add(email);

    let phone = randomPhone();
    while (usedPhone.has(phone)) phone = randomPhone();
    usedPhone.add(phone);

    customers.push({
      name: nm,
      email,
      phone,
      passwordHash: await bcrypt.hash("password123", 10),
      role: "customer",
    });
  }
  const users = await User.insertMany([admin, ...customers]);
  console.log(`Inserted users: ${users.length}`);

  const rangeStart = new Date("2025-08-01T00:00:00+07:00");
  const rangeEnd = new Date("2025-10-31T23:59:59+07:00");

  // Buat ~60–90 order acak agar tidak setiap hari
  const totalOrders = rand(60, 90);

  const provider = "Xendit";
  let paidCount = 0, pendingCount = 0, expiredCount = 0;

  for (let i = 0; i < totalOrders; i++) {
    // Pilih buyer (kadang guest)
    const asRegistered = Math.random() < 1.0; // 75% dari user terdaftar
    const user = asRegistered ? pick(users.filter((u) => u.role === "customer")) : null;

    const buyerName = user ? user.name : randomName();
    const buyerEmail = user ? user.email : randomEmail(buyerName);
    const buyerPhone = user ? user.phone : randomPhone();

    // Pilih 1–3 item produk
    const numItems = rand(1, 3);
    const chosen = [];
    const usedIdx = new Set();
    for (let k = 0; k < numItems; k++) {
      let idx = rand(0, productDocs.length - 1);
      while (usedIdx.has(idx)) idx = rand(0, productDocs.length - 1);
      usedIdx.add(idx);
      const p = productDocs[idx];
      const qty = rand(1, 3);
      chosen.push({
        productId: p._id,
        name: p.name,
        price: p.price,
        quantity: qty,
        subtotal: p.price * qty,
      });
    }

    const orderDate = randomDateBetween(rangeStart, rangeEnd);
    const total = calcTotals(chosen);

    // Tentukan skenario pembayaran:
    // ~60% PAID, ~20% PENDING, ~20% EXPIRED
    const r = Math.random();
    let orderStatus = "waiting_payment";
    let paymentStatus = "PENDING";
    if (r < 0.6) {
      orderStatus = "lunas";
      paymentStatus = "PAID";
      paidCount++;
    } else if (r < 0.8) {
      orderStatus = "waiting_payment";
      paymentStatus = "PENDING";
      pendingCount++;
    } else {
      orderStatus = "expired";
      paymentStatus = "EXPIRED";
      expiredCount++;
    }

    // Buat Order
    const orderDoc = await Order.create({
      userId: user?._id,
      buyer: { name: buyerName, email: buyerEmail, phone: buyerPhone },
      items: chosen,
      total,
      status: orderStatus,
      createdAt: orderDate,
      updatedAt: orderDate,
    });

    // Sebagian kecil order belum membuat invoice sama sekali (tanpa Payment)
    const makePayment = Math.random() < 0.92 || orderStatus !== "waiting_payment"; // jika paid/expired pasti ada payment
    if (makePayment) {
      const invoiceId = slugifyInvoiceId(orderDate);
      const paymentCreatedAt = new Date(orderDate.getTime() + rand(1, 60) * 60 * 1000); // + 1–60 menit
      const paymentUpdatedAt =
        paymentStatus === "PAID"
          ? new Date(paymentCreatedAt.getTime() + rand(5, 180) * 60 * 1000) // + 5–180 menit
          : paymentCreatedAt;

      const paymentDoc = await Payment.create({
        provider: "Xendit",
        invoiceId,
        externalUrl: `https://pay.example/${invoiceId}`,
        amount: total,
        status: paymentStatus,
        orderId: orderDoc._id,
        raw: {
          channel: provider === "Xendit" ? "VA" : "QRIS",
          notes:
            paymentStatus === "PAID"
              ? "Payment captured successfully"
              : paymentStatus === "PENDING"
              ? "Awaiting customer payment"
              : "Invoice expired",
        },
        createdAt: paymentCreatedAt,
        updatedAt: paymentUpdatedAt,
      });

      // Tambahkan reference ke Order
      orderDoc.paymentId = paymentDoc._id;

      // Sinkronkan updatedAt Order sesuai status
      if (paymentStatus === "PAID") {
        orderDoc.status = "lunas";
        orderDoc.updatedAt = paymentUpdatedAt;
      } else if (paymentStatus === "EXPIRED") {
        orderDoc.status = "expired";
        orderDoc.updatedAt = paymentUpdatedAt;
      } else {
        // PENDING -> biarkan updatedAt dekat paymentCreatedAt
        orderDoc.updatedAt = paymentCreatedAt;
      }
      await orderDoc.save();
    } else {
      // Order menunggu pembayaran tapi belum pernah membuat invoice
      // Biarkan status "waiting_payment" dan paymentId undefined
    }
  }

  console.log("Seed selesai:");
  console.log(`- Orders (total): ${await Order.countDocuments()}`);
  console.log(`  • PAID:   ${await Payment.countDocuments({ status: "PAID" })} (orders lunas mungkin sedikit >/< tergantung invoice missing)`);
  console.log(`  • PENDING:${await Payment.countDocuments({ status: "PENDING" })}`);
  console.log(`  • EXPIRED:${await Payment.countDocuments({ status: "EXPIRED" })}`);
  console.log(`- Users: ${await User.countDocuments()}`);
  console.log(`- Products: ${await Product.countDocuments()}`);

  await mongoose.disconnect();
  console.log("Disconnected. Seed data berhasil dimasukkan");
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
