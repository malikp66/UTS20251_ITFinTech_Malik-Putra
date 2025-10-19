import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { validateLoginInput } from "@/lib/validation";
import { verifyPassword, hashOtp } from "@/lib/passwords";
import { setPendingCookie } from "@/lib/auth";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }
  const validation = validateLoginInput(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  const { email, password } = validation.data;
  await dbConnect();
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Email atau password salah" });
  }
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ error: "Email atau password salah" });
  }
  const otp = generateOtp();
  user.otpCode = await hashOtp(otp);
  user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();
  await sendWhatsAppMessage(user.phone, `Kode OTP Malik Gaming Store Anda: ${otp}. Berlaku selama 5 menit.`);
  setPendingCookie(res, { userId: user._id.toString() });
  return res.status(200).json({
    message: "OTP telah dikirim ke WhatsApp",
    data: { requiresOtp: true }
  });
}
