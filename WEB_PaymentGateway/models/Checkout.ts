import { Model, Schema, Types, model, models } from "mongoose";

export type CheckoutItem = {
  productId: Types.ObjectId;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
};

export type CheckoutDocument = {
  items: CheckoutItem[];
  buyer: {
    email: string;
    phone: string;
  };
  total: number;
  status: "pending" | "paid" | "expired";
  paymentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const CheckoutSchema = new Schema<CheckoutDocument>(
  {
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        qty: { type: Number, required: true },
        subtotal: { type: Number, required: true }
      }
    ],
    buyer: {
      email: { type: String, required: true },
      phone: { type: String, required: true }
    },
    total: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "expired"], default: "pending" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" }
  },
  { timestamps: true }
);

const Checkout: Model<CheckoutDocument> = models.Checkout || model<CheckoutDocument>("Checkout", CheckoutSchema);

export default Checkout;
