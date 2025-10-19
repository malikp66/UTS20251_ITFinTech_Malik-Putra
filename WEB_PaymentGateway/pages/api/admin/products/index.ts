import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { validateProductPayload } from "@/lib/validation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) {
    return;
  }
  if (req.method === "GET") {
    await dbConnect();
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ data: products });
  }
  if (req.method === "POST") {
    const validation = validateProductPayload(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    await dbConnect();
    const product = await Product.create({
      ...validation.data,
      active: true
    });
    return res.status(201).json({ message: "Produk ditambahkan", data: product.toObject() });
  }
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Metode tidak diizinkan" });
}
