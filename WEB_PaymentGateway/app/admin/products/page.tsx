import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

import { ProductsManager } from "./components/ProductsManager";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  description: string;
  stock: number;
  image: string;
  createdAt: string;
  updatedAt: string;
};

export default async function AdminProductsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    redirect("/admin/login");
  }

  await dbConnect();
  const productsRaw = await Product.find().sort({ updatedAt: -1 }).lean();
  const products: ProductRow[] = productsRaw.map((product) => ({
    id: product._id.toString(),
    name: product.name,
    price: product.price,
    description: product.description,
    stock: product.stock,
    image: product.image,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  }));

  return <ProductsManager products={products} />;
}

export type { ProductRow };
