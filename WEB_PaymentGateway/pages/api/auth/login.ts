import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcrypt";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { createSession } from "@/lib/auth";
import { sendOtpMessage } from "@/lib/whatsapp";
import { isDevEnv } from "@/lib/env";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(8, "Password wajib diisi"),
  requireAdmin: z.boolean().optional().default(false)
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join(", ");
    return res.status(400).json({ error: message });
  }
  const { email, password, requireAdmin } = parsed.data;
  try {
    await dbConnect();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Email atau password salah" });
    }
    if (requireAdmin && user.role !== "admin") {
      return res.status(403).json({ error: "Akses admin diperlukan" });
    }
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Email atau password salah" });
    }
    const sanitizedPhone = typeof user.phone === "string" ? user.phone.trim() : "";
    if (user.role === "admin") {
      const session = {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: sanitizedPhone,
        role: user.role
      };
      createSession(res, session);
      return res.status(200).json({ success: true, user: session });
    }
    const code = generateOtp();
    if (isDevEnv()) {
      console.info("[DEV] Generated OTP", { email: user.email, phone: user.phone, code });
    }
    const otpHash = await bcrypt.hash(code, 10);
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    user.otpCode = otpHash;
    user.otpExpiry = expiry;
    user.otpAttempts = 0;
    await user.save();
    await sendOtpMessage(sanitizedPhone, code);
    return res
      .status(200)
      .json({ mfaRequired: true, email: user.email, phone: sanitizedPhone });
  } catch (error) {
    console.error("Login error", error);
    return res.status(500).json({ error: "Gagal memproses login" });
  }
}
