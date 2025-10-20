import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { requireApiAuth } from "@/lib/auth";
import { sendPaymentSuccessNotification } from "@/lib/whatsapp";

const updateSchema = z.object({
  status: z.enum(["waiting_payment", "lunas", "expired"])
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireApiAuth(req, res, { adminOnly: true });
  if (!session) {
    return;
  }
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).end();
  }
  const { id } = req.query;
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Order ID tidak valid" });
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join(", ");
    return res.status(400).json({ error: message });
  }
  try {
    await dbConnect();
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }
    order.status = parsed.data.status;
    await order.save();
    if (parsed.data.status === "lunas") {
      await sendPaymentSuccessNotification(order._id.toString());
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Update order status failed", error);
    return res.status(500).json({ error: "Gagal memperbarui status order" });
  }
}
