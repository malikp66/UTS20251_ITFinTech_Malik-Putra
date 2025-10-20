import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import User from "@/models/User";
import { requireApiAuth } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireApiAuth(req, res, { adminOnly: true });
  if (!session) {
    return;
  }
  if (req.method === "GET") {
    try {
      await dbConnect();
      const orders = await Order.find().sort({ createdAt: -1 }).lean();
      const userIds = orders
        .map(order => order.userId)
        .filter(Boolean)
        .map(id => id?.toString());
      const uniqueUserIds = Array.from(new Set(userIds));
      const users = uniqueUserIds.length > 0 ? await User.find({ _id: { $in: uniqueUserIds } }).lean() : [];
      const userMap = new Map(users.map(user => [user._id.toString(), user]));
      const data = orders.map(order => {
        const user = order.userId ? userMap.get(order.userId.toString()) : null;
        return {
          ...order,
          _id: order._id.toString(),
          user: user
            ? {
                name: user.name,
                email: user.email,
                phone: user.phone
              }
            : null
        };
      });
      return res.status(200).json({ data });
    } catch (error) {
      console.error("Failed to load orders", error);
      return res.status(500).json({ error: "Gagal mengambil data orders" });
    }
  }
  res.setHeader("Allow", "GET");
  return res.status(405).end();
}
