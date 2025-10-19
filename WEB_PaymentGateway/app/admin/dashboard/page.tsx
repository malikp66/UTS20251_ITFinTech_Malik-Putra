import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import User from "@/models/User";

import { DashboardView } from "./components/DashboardView";

export type OrderItem = {
  productId: string | null;
  name: string;
  price: number;
  quantity: number;
};

export type OrderRow = {
  id: string;
  user: { id: string; name: string; email: string; phone: string } | null;
  items: OrderItem[];
  total: number;
  status: "waiting payment" | "lunas";
  createdAt: string;
};

export type Analytics = {
  daily: Array<{ date: string; total: number }>;
  monthly: Array<{ date: string; total: number }>;
  stats: {
    totalOrders: number;
    totalRevenue: number;
    paidPercentage: number;
    waitingCount: number;
    paidCount: number;
  };
};

function formatDateKey(entry: { y: number; m: number; d?: number }) {
  const date = new Date(entry.y, entry.m - 1, entry.d ?? 1);
  return date.toISOString();
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    redirect("/admin/login");
  }

  await dbConnect();
  const ordersRaw = await Order.find().sort({ createdAt: -1 }).lean();
  const userIds = Array.from(new Set(ordersRaw.map((order) => order.userId?.toString())));
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  const orders: OrderRow[] = ordersRaw.map((order) => {
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
        productId: item.productId?.toString?.() ?? null,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt.toISOString()
    };
  });

  const [dailyAgg, monthlyAgg, statusAgg] = await Promise.all([
    Order.aggregate([
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" }
          },
          total: { $sum: "$total" }
        }
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } }
    ]),
    Order.aggregate([
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" }
          },
          total: { $sum: "$total" }
        }
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } }
    ]),
    Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$total" }
        }
      }
    ])
  ]);

  const totals = statusAgg.reduce(
    (acc, entry) => {
      acc.totalOrders += entry.count;
      acc.totalRevenue += entry.revenue;
      if (entry._id === "lunas") {
        acc.paidCount = entry.count;
      }
      if (entry._id === "waiting payment") {
        acc.waitingCount = entry.count;
      }
      return acc;
    },
    { totalOrders: 0, totalRevenue: 0, paidCount: 0, waitingCount: 0 }
  );

  const analytics: Analytics = {
    daily: dailyAgg.map((entry) => ({ date: formatDateKey(entry._id), total: entry.total })),
    monthly: monthlyAgg.map((entry) => ({ date: formatDateKey(entry._id), total: entry.total })),
    stats: {
      totalOrders: totals.totalOrders,
      totalRevenue: totals.totalRevenue,
      paidPercentage: totals.totalOrders ? Math.round((totals.paidCount / totals.totalOrders) * 100) : 0,
      waitingCount: totals.waitingCount,
      paidCount: totals.paidCount
    }
  };

  return <DashboardView orders={orders} analytics={analytics} />;
}
