import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Checkout from "@/models/Checkout";
import Payment from "@/models/Payment";

const XENDIT_URL = "https://api.xendit.co/v2/invoices";

function buildBasicAuth(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const secretKey = process.env.XENDIT_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secretKey || !siteUrl) {
    return res.status(500).json({ error: "Konfigurasi Xendit belum lengkap" });
  }
  try {
    const { checkoutId } = req.body as { checkoutId?: string };
    if (!checkoutId || !mongoose.Types.ObjectId.isValid(checkoutId)) {
      return res.status(400).json({ error: "Checkout ID tidak valid" });
    }
    await dbConnect();
    const checkout = await Checkout.findById(checkoutId);
    if (!checkout) {
      return res.status(404).json({ error: "Checkout tidak ditemukan" });
    }
    if (checkout.status === "paid") {
      return res.status(400).json({ error: "Checkout sudah dibayar" });
    }
    if (checkout.paymentId) {
      const existingPayment = await Payment.findById(checkout.paymentId);
      if (existingPayment) {
        if (existingPayment.status === "PAID") {
          return res.status(400).json({ error: "Invoice sudah dibayar" });
        }
        if (existingPayment.status === "PENDING") {
          return res.status(200).json({ invoiceUrl: existingPayment.externalUrl });
        }
      }
    }
    const description = `Top up ${checkout.items.map(item => item.name).join(", ")}`;
    const response = await fetch(XENDIT_URL, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuth(secretKey),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        external_id: `checkout-${checkout._id.toString()}`,
        payer_email: checkout.buyer.email,
        description,
        amount: checkout.total,
        currency: "IDR",
        success_redirect_url: `${siteUrl}/payment?checkoutId=${checkout._id.toString()}`,
        failure_redirect_url: `${siteUrl}/payment?checkoutId=${checkout._id.toString()}`,
        customer: {
          email: checkout.buyer.email,
          mobile_number: checkout.buyer.phone
        },
        metadata: {
          checkoutId: checkout._id.toString()
        }
      })
    });
    if (!response.ok) {
      return res.status(502).json({ error: "Gagal membuat invoice di Xendit" });
    }
    const invoice = await response.json();
    const payment = await Payment.create({
      provider: "xendit",
      invoiceId: invoice.id,
      externalUrl: invoice.invoice_url,
      amount: invoice.amount,
      status: invoice.status ? String(invoice.status).toUpperCase() : "PENDING",
      checkoutId: checkout._id,
      raw: invoice
    });
    checkout.paymentId = payment._id;
    checkout.status = "pending";
    await checkout.save();
    return res.status(200).json({ invoiceUrl: payment.externalUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Terjadi kesalahan pada pembuatan invoice" });
  }
}
