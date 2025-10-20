import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { requireApiAuth } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(3, "Nama produk minimal 3 karakter"),
  price: z.coerce.number().positive("Harga harus lebih dari 0"),
  description: z.string().trim().optional(),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
  image: z.string().trim().url("URL gambar tidak valid").optional(),
  game: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  active: z.coerce.boolean().optional()
});

function buildSku(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${normalized}-${suffix}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireApiAuth(req, res, { adminOnly: true });
  if (!session) {
    return;
  }
  if (req.method === "GET") {
    try {
      await dbConnect();
      const products = await Product.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json({ data: products });
    } catch (error) {
      console.error("Get products error", error);
      return res.status(500).json({ error: "Gagal mengambil produk" });
    }
  }
  if (req.method === "POST") {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map(issue => issue.message).join(", ");
      return res.status(400).json({ error: message });
    }
    try {
      await dbConnect();
      const payload = parsed.data;
      const product = await Product.create({
        name: payload.name,
        price: payload.price,
        description: payload.description,
        stock: payload.stock,
        image: payload.image,
        game: payload.game || "general",
        currency: payload.currency || "IDR",
        active: payload.active ?? true,
        sku: buildSku(payload.name)
      });
      return res.status(201).json({ data: product });
    } catch (error) {
      console.error("Create product error", error);
      return res.status(500).json({ error: "Gagal membuat produk" });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).end();
}
