import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
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
    const { orderId } = req.body as { orderId?: string };
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Order ID tidak valid" });
    }
    await dbConnect();
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }
    if (order.status === "lunas") {
      return res.status(400).json({ error: "Order sudah dibayar" });
    }
    if (order.paymentId) {
      const existingPayment = await Payment.findById(order.paymentId);
      if (existingPayment) {
        if (existingPayment.status === "PAID") {
          return res.status(400).json({ error: "Invoice sudah dibayar" });
        }
        if (existingPayment.status === "PENDING") {
          return res.status(200).json({ invoiceUrl: existingPayment.externalUrl });
        }
      }
    }
    const description = `Top up ${order.items.map(item => item.name).join(", ")}`;
    const response = await fetch(XENDIT_URL, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuth(secretKey),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        external_id: `order-${order._id.toString()}`,
        payer_email: order.buyer.email,
        description,
        amount: order.total,
        currency: "IDR",
        success_redirect_url: `${siteUrl}/payment?orderId=${order._id.toString()}`,
        failure_redirect_url: `${siteUrl}/payment?orderId=${order._id.toString()}`,
        customer: {
          email: order.buyer.email,
          mobile_number: order.buyer.phone
        },
        metadata: {
          orderId: order._id.toString()
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
      orderId: order._id,
      raw: invoice
    });
    order.paymentId = payment._id;
    order.status = "waiting_payment";
    await order.save();
    return res.status(200).json({ invoiceUrl: payment.externalUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Terjadi kesalahan pada pembuatan invoice" });
  }
}
