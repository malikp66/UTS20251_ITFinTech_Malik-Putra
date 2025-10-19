import { Schema, models, model, Types } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const OrderSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true },
  items: { type: [OrderItemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["waiting payment", "lunas"],
    default: "waiting payment",
    index: true
  },
  createdAt: { type: Date, default: Date.now }
});

export default models.Order || model("Order", OrderSchema);
