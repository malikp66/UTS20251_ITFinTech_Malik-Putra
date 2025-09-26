import { Model, Schema, Types, model, models } from "mongoose";

export type PaymentDocument = {
  provider: string;
  invoiceId: string;
  externalUrl: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED";
  checkoutId: Types.ObjectId;
  raw: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const PaymentSchema = new Schema<PaymentDocument>(
  {
    provider: { type: String, required: true },
    invoiceId: { type: String, required: true, unique: true },
    externalUrl: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "PAID", "EXPIRED"], default: "PENDING" },
    checkoutId: { type: Schema.Types.ObjectId, ref: "Checkout", required: true },
    raw: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

const Payment: Model<PaymentDocument> = models.Payment || model<PaymentDocument>("Payment", PaymentSchema);

export default Payment;
