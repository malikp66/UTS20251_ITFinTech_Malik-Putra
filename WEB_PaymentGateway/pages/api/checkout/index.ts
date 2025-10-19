import type { NextApiRequest, NextApiResponse } from "next"
import { dbConnect } from "@/lib/db"
import Product from "@/models/Product"
import Checkout from "@/models/Checkout"
import { getSession } from "@/lib/auth"
import { buildCheckoutSummary, sendWhatsAppMessage } from "@/lib/whatsapp"
import { normalizePhoneNumber } from "@/lib/utils"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "method not allowed" })
  try {
    const { items, buyer } = req.body || {}
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "items kosong atau invalid" })
    if (!buyer?.email || !buyer?.phone) return res.status(400).json({ message: "buyer.email dan buyer.phone wajib" })

    await dbConnect()

    const ids = items.map((i: any) => i.productId)
    const products = await Product.find({ _id: { $in: ids }, active: true }).lean()
    if (products.length !== ids.length) return res.status(400).json({ message: "produk tidak ditemukan atau non-aktif" })

    const map = new Map(products.map((p: any) => [String(p._id), p]))
    const serverItems = items.map((i: any) => {
      const p = map.get(String(i.productId))
      const qty = Math.max(1, Number(i.qty) || 1)
      const price = Number(p.price) || 0
      return { productId: p._id, name: p.name, price, qty, subtotal: price * qty }
    })

    const subtotal = serverItems.reduce((s: number, it: any) => s + it.subtotal, 0)
    const fee = subtotal > 0 ? 2000 : 0
    const total = subtotal + fee

    const session = getSession(req)
    const doc = await Checkout.create({
      items: serverItems,
      buyer: {
        email: String(buyer.email),
        phone: normalizePhoneNumber(String(buyer.phone)),
        name: buyer.name ? String(buyer.name) : undefined
      },
      userId: session?.userId,
      total,
      status: "waiting_payment",
    })

    await sendWhatsAppMessage(doc.buyer.phone, [
      "Halo! Pesanan Anda telah kami terima.",
      buildCheckoutSummary(doc),
      "",
      "Silakan selesaikan pembayaran sesuai instruksi pada invoice."
    ].join("\n"))

    return res.status(201).json({ checkoutId: String(doc._id) })
  } catch (e: any) {
    return res.status(400).json({ message: e?.message || "failed to create checkout" })
  }
}
