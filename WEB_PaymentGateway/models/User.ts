import { Model, Schema, model, models } from "mongoose";

export type UserDocument = {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "admin" | "customer";
  otpCode?: string;
  otpExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    otpCode: { type: String },
    otpExpiry: { type: Date }
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

const User: Model<UserDocument> = models.User || model<UserDocument>("User", UserSchema);

export default User;
