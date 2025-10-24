import { Model, Schema, model, models } from "mongoose";

export type ProductDocument = {
  game: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  active: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

const ProductSchema = new Schema<ProductDocument>(
  {
    game: { type: String, lowercase: true, trim: true, default: "general" },
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true, default: "IDR" },
    active: { type: Boolean, default: true },
    description: { type: String }
  },
  { timestamps: true }
);

const Product: Model<ProductDocument> = models.Product || model<ProductDocument>("Product", ProductSchema);

export default Product;
