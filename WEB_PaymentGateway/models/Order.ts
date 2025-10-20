import { Model, Schema, Types, model, models } from "mongoose";

export type OrderItem = {
  productId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type OrderStatus = "waiting_payment" | "lunas" | "expired";

export type OrderDocument = {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  buyer: {
    name?: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const OrderSchema = new Schema<OrderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    buyer: {
      name: { type: String },
      email: { type: String, required: true },
      phone: { type: String, required: true }
    },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        subtotal: { type: Number, required: true }
      }
    ],
    total: { type: Number, required: true },
    status: { type: String, enum: ["waiting_payment", "lunas", "expired"], default: "waiting_payment" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" }
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });

const Order: Model<OrderDocument> = models.Order || model<OrderDocument>("Order", OrderSchema);

export default Order;
