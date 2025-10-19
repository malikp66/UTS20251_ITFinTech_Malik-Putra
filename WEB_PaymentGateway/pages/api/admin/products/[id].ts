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
  const { id } = req.query as { id: string };
  if (req.method === "GET") {
    await dbConnect();
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }
    return res.status(200).json({ data: product });
  }
  if (req.method === "PUT") {
    const validation = validateProductPayload(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    await dbConnect();
    const product = await Product.findByIdAndUpdate(
      id,
      { ...validation.data },
      { new: true }
    ).lean();
    if (!product) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }
    return res.status(200).json({ message: "Produk diperbarui", data: product });
  }
  if (req.method === "DELETE") {
    await dbConnect();
    await Product.findByIdAndDelete(id);
    return res.status(200).json({ message: "Produk dihapus" });
  }
  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Metode tidak diizinkan" });
}
