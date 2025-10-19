import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Checkout from "@/models/Checkout";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) {
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }
  await dbConnect();
  const paidFilter = { status: "paid" };
  const daily = await Checkout.aggregate([
    { $match: paidFilter },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: "$total" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  const monthly = await Checkout.aggregate([
    { $match: paidFilter },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        total: { $sum: "$total" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  return res.status(200).json({
    data: {
      daily: daily.map((row) => ({ date: row._id, total: row.total })),
      monthly: monthly.map((row) => ({ month: row._id, total: row.total }))
    }
  });
}
