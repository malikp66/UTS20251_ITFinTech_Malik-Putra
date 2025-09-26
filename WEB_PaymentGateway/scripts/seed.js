const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI belum disetel");
  process.exit(1);
}

const productSchema = new mongoose.Schema(
  {
    game: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true, default: "IDR" },
    image: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

const products = [
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
  { game: "roblox", name: "Roblox Premium 450", sku: "ROBLOX-PREMIUM", price: 119000, currency: "IDR", active: true }
];

async function seed() {
  await mongoose.connect(uri);
  await Product.deleteMany({});
  await Product.insertMany(products);
  await mongoose.disconnect();
  console.log("Seed data berhasil dimasukkan");
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
