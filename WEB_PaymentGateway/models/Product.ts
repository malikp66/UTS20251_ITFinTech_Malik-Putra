import { Schema, models, model } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    stock: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" }
  },
  { timestamps: true }
);

export default models.Product || model("Product", ProductSchema);
