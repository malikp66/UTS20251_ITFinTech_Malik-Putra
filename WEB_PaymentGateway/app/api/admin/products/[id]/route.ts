import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  image: z.string().url().optional()
});

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await dbConnect();
  const product = await Product.findById(params.id).lean();
  if (!product) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const product = await Product.findByIdAndUpdate(
    params.id,
    { $set: parsed.data },
    { new: true }
  ).lean();

  if (!product) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await dbConnect();
  const result = await Product.findByIdAndDelete(params.id).lean();
  if (!result) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
