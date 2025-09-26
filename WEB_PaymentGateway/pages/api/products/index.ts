import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  try {
    await dbConnect();
    const { game } = req.query;
    const filter: Record<string, unknown> = { active: true };
    if (typeof game === "string" && game.trim() !== "") {
      filter.game = game.toLowerCase();
    }
    const products = await Product.find(filter).sort({ price: 1 });
    return res.status(200).json({ data: products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Gagal mengambil data produk" });
  }
}
