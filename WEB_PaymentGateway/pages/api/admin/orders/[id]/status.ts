import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Checkout from "@/models/Checkout";
import { validateStatusInput } from "@/lib/validation";
import { buildPaymentConfirmation, sendWhatsAppMessage } from "@/lib/whatsapp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) {
    return;
  }
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }
  const { id } = req.query as { id: string };
  const validation = validateStatusInput(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  await dbConnect();
  const order = await Checkout.findById(id);
  if (!order) {
    return res.status(404).json({ error: "Pesanan tidak ditemukan" });
  }
  order.status = validation.data.status;
  await order.save();
  if (validation.data.status === "paid") {
    await sendWhatsAppMessage(order.buyer.phone, buildPaymentConfirmation(order));
  }
  return res.status(200).json({ message: "Status diperbarui" });
}
