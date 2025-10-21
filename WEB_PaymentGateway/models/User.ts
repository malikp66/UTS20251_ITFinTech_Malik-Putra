import { Model, Schema, Types, model, models } from "mongoose";

export type UserRole = "admin" | "customer";

export type UserDocument = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  otpCode?: string; // stores hashed value
  otpExpiry?: Date;
  mfaEnabled?: boolean;
  otpAttempts?: number;
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    mfaEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const User: Model<UserDocument> = models.User || model<UserDocument>("User", UserSchema);

export default User;
