import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { requireApiAuth } from "@/lib/auth";

const updateSchema = z
  .object({
    name: z.string().trim().min(3).optional(),
    price: z.coerce.number().positive().optional(),
    description: z.string().trim().optional(),
    game: z.string().trim().optional(),
    currency: z.string().trim().optional(),
    active: z.coerce.boolean().optional()
  })
  .strict();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireApiAuth(req, res, { adminOnly: true });
  if (!session) {
    return;
  }
  const { id } = req.query;
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Product ID tidak valid" });
  }
  await dbConnect();
  if (req.method === "GET") {
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }
    return res.status(200).json({ data: product });
  }
  if (req.method === "PATCH") {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map(issue => issue.message).join(", ");
      return res.status(400).json({ error: message });
    }
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean();
    if (!product) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }
    return res.status(200).json({ data: product });
  }
  if (req.method === "DELETE") {
    await Product.findByIdAndDelete(id);
    return res.status(204).end();
  }
  res.setHeader("Allow", "GET, PATCH, DELETE");
  return res.status(405).end();
}
