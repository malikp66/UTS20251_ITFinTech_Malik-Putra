const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI belum disetel di file .env.local");
  process.exit(1);
}

const [, , emailArg, passwordArg, phoneArg, nameArg] = process.argv;

const email = (emailArg || "").toLowerCase();
const password = passwordArg;
const phone = phoneArg;
const name = nameArg || "Administrator";

if (!email || !password || !phone) {
  console.error("Penggunaan: node scripts/create-admin.js <email> <password> <nomorWhatsApp> [nama]");
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    mfaEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
  try {
    await mongoose.connect(uri);
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await User.findOne({ email });

    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.passwordHash = passwordHash;
      existing.role = "admin";
      existing.otpCode = undefined;
      existing.otpExpiry = undefined;
      existing.otpAttempts = 0;
      await existing.save();
      console.log(`Admin diperbarui untuk email ${email}`);
    } else {
      await User.create({
        name,
        email,
        phone,
        passwordHash,
        role: "admin"
      });
      console.log(`Admin baru dibuat dengan email ${email}`);
    }
  } catch (error) {
    console.error("Gagal membuat atau memperbarui admin:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
