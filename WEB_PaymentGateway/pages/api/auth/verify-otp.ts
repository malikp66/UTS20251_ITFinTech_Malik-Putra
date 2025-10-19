import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { validateOtpInput } from "@/lib/validation";
import { getPendingSession, setSessionCookie, clearSession } from "@/lib/auth";
import { verifyOtp } from "@/lib/passwords";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }
  const pending = getPendingSession(req);
  if (!pending) {
    return res.status(401).json({ error: "Sesi OTP tidak ditemukan" });
  }
  const validation = validateOtpInput(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  await dbConnect();
  const user = await User.findById(pending.userId);
  if (!user || !user.otpCode || !user.otpExpiry) {
    clearSession(res);
    return res.status(401).json({ error: "Sesi OTP tidak valid" });
  }
  if (user.otpExpiry.getTime() < Date.now()) {
    clearSession(res);
    return res.status(401).json({ error: "Kode OTP kedaluwarsa" });
  }
  const valid = await verifyOtp(validation.data.code, user.otpCode);
  if (!valid) {
    return res.status(401).json({ error: "Kode OTP tidak sesuai" });
  }
  user.otpCode = undefined;
  user.otpExpiry = undefined;
  await user.save();
  setSessionCookie(res, {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name
  });
  return res.status(200).json({
    message: "Login berhasil",
    data: { role: user.role }
  });
}
