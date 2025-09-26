import { Model, Schema, model, models } from "mongoose";

export type ProductDocument = {
  game: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  image?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const ProductSchema = new Schema<ProductDocument>(
  {
    game: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true, default: "IDR" },
    image: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Product: Model<ProductDocument> = models.Product || model<ProductDocument>("Product", ProductSchema);

export default Product;
