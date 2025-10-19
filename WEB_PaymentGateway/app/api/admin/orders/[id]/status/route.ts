import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { sendPaidNotification } from "@/lib/whatsapp";
import Order from "@/models/Order";
import User from "@/models/User";

const statusSchema = z.object({ status: z.enum(["waiting payment", "lunas"]) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const order = await Order.findByIdAndUpdate(params.id, { status: parsed.data.status }, { new: true }).lean();
  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  if (parsed.data.status === "lunas") {
    const user = await User.findById(order.userId).lean();
    if (user?.phone) {
      await sendPaidNotification({ phone: user.phone, order });
    }
  }

  return NextResponse.json({ success: true, order: { id: order._id.toString(), status: order.status } });
}
