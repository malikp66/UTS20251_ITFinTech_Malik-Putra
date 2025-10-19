import { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "customer"], default: "customer", index: true },
    otpCodeHash: { type: String, default: null },
    otpExpiry: { type: Date, default: null }
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
