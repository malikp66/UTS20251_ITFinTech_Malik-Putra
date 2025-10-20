import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import Product, { type ProductDocument } from "@/models/Product";
import Order from "@/models/Order";
import { getSessionFromRequest } from "@/lib/auth";
import { sendCheckoutNotification } from "@/lib/whatsapp";

function normalizePhone(input: string) {
  const d = (input || "").replace(/[^0-9+]/g, "");
  if (d.startsWith("+62")) return d.slice(1);
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("8")) return "62" + d;
  return d;
}

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID wajib diisi"),
        qty: z.number().int().positive().optional(),
        quantity: z.number().int().positive().optional()
      })
    )
    .min(1, "Minimal satu item"),
  buyer: z.object({
    name: z.string().trim().optional(),
    email: z.string().email("Email tidak valid"),
    phone: z.string().min(6, "Nomor telepon tidak valid")
  })
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "method not allowed" });
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map(issue => issue.message).join(", ");
      return res.status(400).json({ message });
    }

    const { items, buyer } = parsed.data;

    await dbConnect();

    type LeanProduct = ProductDocument & { _id: Types.ObjectId };
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds }, active: true }).lean<LeanProduct>();
    if (products.length !== productIds.length) {
      return res.status(400).json({ message: "produk tidak ditemukan atau non-aktif" });
    }

    const productMap = new Map(products.map(product => [product._id.toString(), product]));
    const serverItems = items.map(item => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error("Produk tidak ditemukan");
      }
      const requestedQty = item.quantity ?? item.qty ?? 1;
      const quantity = Math.max(1, requestedQty);
      const price = Number(product.price) || 0;
      return { productId: product._id, name: product.name, price, quantity, subtotal: price * quantity };
    });

    const subtotal = serverItems.reduce((sum, entry) => sum + entry.subtotal, 0);
    const fee = subtotal > 0 ? 2000 : 0;
    const total = subtotal + fee;

    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const order = await Order.create({
      items: serverItems,
      buyer: {
        name: buyer.name,
        email: String(buyer.email),
        phone: normalizePhone(String(buyer.phone))
      },
      total,
      status: "waiting_payment",
      userId: session.userId
    });

    await sendCheckoutNotification(order);

    return res.status(201).json({ orderId: String(order._id) });
  } catch (error: unknown) {
    console.error("Checkout error", error);
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(400).json({ message: "failed to create checkout" });
  }
}
