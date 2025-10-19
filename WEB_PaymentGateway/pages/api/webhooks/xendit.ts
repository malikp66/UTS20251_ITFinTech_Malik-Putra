import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Payment from "@/models/Payment";
import Checkout from "@/models/Checkout";
import { buildPaymentConfirmation, sendWhatsAppMessage } from "@/lib/whatsapp";

function normalizeStatus(status: string | undefined) {
  const value = status ? status.toUpperCase() : "";
  if (value === "PAID") {
    return "PAID" as const;
  }
  if (value === "EXPIRED") {
    return "EXPIRED" as const;
  }
  return "PENDING" as const;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const expectedToken = process.env.XENDIT_CALLBACK_TOKEN;
  const receivedToken = Array.isArray(req.headers["x-callback-token"]) ? req.headers["x-callback-token"][0] : req.headers["x-callback-token"];
  if (!expectedToken || receivedToken !== expectedToken) {
    return res.status(401).json({ error: "Token tidak valid" });
  }
  try {
    const payload = req.body as {
      id?: string;
      status?: string;
      data?: { id?: string; status?: string };
    };
    const invoiceId = payload.id || payload.data?.id;
    if (!invoiceId) {
      return res.status(400).json({ error: "Invoice ID tidak ditemukan" });
    }
    await dbConnect();
    const payment = await Payment.findOne({ invoiceId });
    if (!payment) {
      return res.status(200).json({ success: true });
    }
    const status = normalizeStatus(payload.status || payload.data?.status);
    payment.status = status;
    payment.raw = payload;
    await payment.save();
    if (status === "PAID") {
      const checkout = await Checkout.findById(payment.checkoutId);
      if (checkout) {
        checkout.status = "paid";
        await checkout.save();
        await sendWhatsAppMessage(checkout.buyer.phone, buildPaymentConfirmation(checkout));
      }
    }
    if (status === "EXPIRED") {
      await Checkout.findByIdAndUpdate(payment.checkoutId, { status: "expired" });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Gagal memproses webhook" });
  }
}
