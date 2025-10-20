import type { NextApiRequest, NextApiResponse } from "next";
import { subDays, subMonths, startOfDay, startOfMonth } from "date-fns";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import { requireApiAuth } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireApiAuth(req, res, { adminOnly: true });
  if (!session) {
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  try {
    await dbConnect();
    const today = new Date();
    const dailyFrom = startOfDay(subDays(today, 14));
    const monthlyFrom = startOfMonth(subMonths(today, 11));
    const [daily, monthly] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: dailyFrom } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" }
            },
            total: { $sum: "$total" }
          }
        },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: "$_id.year",
                month: "$_id.month",
                day: "$_id.day"
              }
            },
            total: 1,
            _id: 0
          }
        },
        { $sort: { date: 1 } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: monthlyFrom } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            total: { $sum: "$total" }
          }
        },
        {
          $project: {
            year: "$_id.year",
            month: "$_id.month",
            total: 1,
            _id: 0
          }
        },
        { $sort: { year: 1, month: 1 } }
      ])
    ]);
    return res.status(200).json({ daily, monthly });
  } catch (error) {
    console.error("Analytics error", error);
    return res.status(500).json({ error: "Gagal mengambil data analytics" });
  }
}
