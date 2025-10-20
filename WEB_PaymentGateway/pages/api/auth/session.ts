import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionFromRequest } from "@/lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(200).json({ authenticated: false });
  }
  return res.status(200).json({ authenticated: true, user: session });
}
