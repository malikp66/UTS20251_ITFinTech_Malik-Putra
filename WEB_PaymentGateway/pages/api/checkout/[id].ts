import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Checkout from "@/models/Checkout";
import Payment from "@/models/Payment";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const { id } = req.query;
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "ID checkout tidak valid" });
  }
  try {
    await dbConnect();
    const checkout = await Checkout.findById(id).lean();
    if (!checkout) {
      return res.status(404).json({ error: "Checkout tidak ditemukan" });
    }
    let payment = null;
    if (checkout.paymentId) {
      const paymentDoc = await Payment.findById(checkout.paymentId).lean();
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
        _id: checkout._id.toString(),
        items: checkout.items.map(item => ({
          productId: item.productId.toString(),
          name: item.name,
          price: item.price,
          qty: item.qty,
          subtotal: item.subtotal
        })),
        buyer: checkout.buyer,
        total: checkout.total,
        status: checkout.status,
        payment
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Gagal mengambil data checkout" });
  }
}
