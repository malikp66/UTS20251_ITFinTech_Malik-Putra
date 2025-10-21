import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcrypt";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { createSession } from "@/lib/auth";

const verifySchema = z.object({
  phone: z.string().trim().min(8, "Nomor WhatsApp tidak valid"),
  code: z.string().trim().min(4, "Kode OTP tidak valid")
});

const MAX_ATTEMPTS = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join(", ");
    return res.status(400).json({ error: message });
  }
  try {
    await dbConnect();
    const normalizedPhone = parsed.data.phone.trim();
    const user = await User.findOne({ phone: normalizedPhone });
    if (!user || !user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ error: "OTP tidak ditemukan, silakan login ulang" });
    }
    if ((user.otpAttempts || 0) >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Percobaan OTP melebihi batas, kirim ulang kode" });
    }
    if (user.otpExpiry.getTime() < Date.now()) {
      user.otpCode = undefined;
      user.otpExpiry = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({ error: "Kode OTP kedaluwarsa, silakan login ulang" });
    }
    const valid = await bcrypt.compare(parsed.data.code, user.otpCode);
    if (!valid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(401).json({ error: "Kode OTP salah" });
    }
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    await user.save();
    const sessionPhone = typeof user.phone === "string" ? user.phone.trim() : "";
    const session = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: sessionPhone,
      role: user.role
    };
    createSession(res, session);
    return res.status(200).json({ success: true, user: session });
  } catch (error) {
    console.error("OTP verification error", error);
    return res.status(500).json({ error: "Gagal memverifikasi OTP" });
  }
}
