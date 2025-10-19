import { Model, Schema, model, models } from "mongoose";

export type ProductDocument = {
  game?: string;
  name: string;
  sku?: string;
  price: number;
  currency?: string;
  description?: string;
  stock?: number;
  image?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const ProductSchema = new Schema<ProductDocument>(
  {
    game: { type: String, lowercase: true, trim: true },
    name: { type: String, required: true },
    sku: { type: String, unique: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "IDR" },
    description: { type: String },
    stock: { type: Number, default: 0 },
    image: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Product: Model<ProductDocument> = models.Product || model<ProductDocument>("Product", ProductSchema);

export default Product;
