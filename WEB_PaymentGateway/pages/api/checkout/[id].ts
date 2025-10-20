import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import Payment from "@/models/Payment";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const { id } = req.query;
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "ID order tidak valid" });
  }
  try {
    await dbConnect();
    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }
    let payment = null;
    if (order.paymentId) {
      const paymentDoc = await Payment.findById(order.paymentId).lean();
      if (paymentDoc) {
        payment = {
          invoiceId: paymentDoc.invoiceId,
          externalUrl: paymentDoc.externalUrl,
          status: paymentDoc.status
        };
      }
    }
    return res.status(200).json({
      data: {
        _id: order._id.toString(),
        items: order.items.map(item => ({
          productId: item.productId.toString(),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal
        })),
        buyer: order.buyer,
        total: order.total,
        status: order.status,
        payment
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Gagal mengambil data checkout" });
  }
}
