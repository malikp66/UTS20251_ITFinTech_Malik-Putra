import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";

function buildDateLabel(entry: any) {
  const { y, m, d } = entry;
  if (typeof d === "number") {
    return new Date(y, m - 1, d).toISOString();
  }
  return new Date(y, m - 1, 1).toISOString();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await dbConnect();

  const [daily, monthly, stats] = await Promise.all([
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

  const totals = stats.reduce(
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

  const paidPercentage = totals.totalOrders
    ? Math.round((totals.paidCount / totals.totalOrders) * 100)
    : 0;

  return NextResponse.json({
    daily: daily.map((entry) => ({
      date: buildDateLabel(entry._id),
      total: entry.total
    })),
    monthly: monthly.map((entry) => ({
      date: buildDateLabel(entry._id),
      total: entry.total
    })),
    stats: {
      totalOrders: totals.totalOrders,
      totalRevenue: totals.totalRevenue,
      paidPercentage,
      waitingCount: totals.waitingCount,
      paidCount: totals.paidCount
    }
  });
}
