import { NextResponse } from "next/server";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import { sendCheckoutNotification } from "@/lib/whatsapp";
import Order from "@/models/Order";
import User from "@/models/User";

const notifySchema = z.object({ orderId: z.string() });

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = notifySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const order = await Order.findById(parsed.data.orderId).lean();
  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  const user = await User.findById(order.userId).lean();
  if (user?.phone) {
    await sendCheckoutNotification({ phone: user.phone, order });
  }

  return NextResponse.json({ success: true });
}
