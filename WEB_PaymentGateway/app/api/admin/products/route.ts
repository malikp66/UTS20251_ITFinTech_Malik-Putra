import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

const productSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  description: z.string().optional(),
  stock: z.coerce.number().int().min(0),
  image: z.string().url().optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await dbConnect();
  const products = await Product.find().sort({ updatedAt: -1 }).lean();

  return NextResponse.json({
    products: products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      description: product.description,
      stock: product.stock,
      image: product.image,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }))
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const product = await Product.create({
    ...parsed.data,
    description: parsed.data.description ?? "",
    image: parsed.data.image ?? ""
  });

  return NextResponse.json({
    product: {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      description: product.description,
      stock: product.stock,
      image: product.image,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }
  });
}
