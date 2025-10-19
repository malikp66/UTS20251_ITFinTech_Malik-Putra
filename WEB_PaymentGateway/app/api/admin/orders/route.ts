import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import User from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await dbConnect();
  const orders = await Order.find().sort({ createdAt: -1 }).lean();
  const userIds = Array.from(new Set(orders.map((order) => order.userId?.toString())));
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  const payload = orders.map((order) => {
    const user = userMap.get(order.userId?.toString() ?? "");
    return {
      id: order._id.toString(),
      user: user
        ? {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone
          }
        : null,
      items: order.items.map((item) => ({
        productId: item.productId?.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt
    };
  });

  return NextResponse.json({ orders: payload });
}
