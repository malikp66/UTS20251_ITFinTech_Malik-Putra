import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Checkout from "@/models/Checkout";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) {
    return;
  }
  if (req.method === "GET") {
    await dbConnect();
    const orders = await Checkout.find()
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .lean();
    return res.status(200).json({
      data: orders.map((order) => ({
        id: order._id.toString(),
        customer: {
          name: (order.buyer?.name as string) || (order as any).userId?.name || "",
          email: (order as any).userId?.email || order.buyer.email
        },
        items: order.items.map((item) => ({
          productId: item.productId.toString(),
          name: item.name,
          price: item.price,
          qty: item.qty,
          subtotal: item.subtotal
        })),
        total: order.total,
        status: order.status,
        createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date(order.createdAt).toISOString()
      }))
    });
  }
  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ error: "Metode tidak diizinkan" });
}
