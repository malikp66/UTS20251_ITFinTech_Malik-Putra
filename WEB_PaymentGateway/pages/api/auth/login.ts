import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcrypt";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { createSession } from "@/lib/auth";
import { sendOtpMessage } from "@/lib/whatsapp";
import { isDevEnv } from "@/lib/env";

const loginSchema = z
  .object({
    method: z.enum(["email", "phone"]).optional(),
    email: z.string().trim().email("Email tidak valid").optional(),
    password: z.string().min(8, "Password wajib diisi").optional(),
    phone: z.string().trim().min(8, "Nomor WhatsApp tidak valid").optional(),
    requireAdmin: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const method = data.method ?? (data.phone && !data.email ? "phone" : "email");
    if (method === "phone") {
      if (!data.phone) {
        ctx.addIssue({ path: ["phone"], code: z.ZodIssueCode.custom, message: "Nomor WhatsApp wajib diisi" });
      }
      if (data.requireAdmin) {
        ctx.addIssue({
          path: ["requireAdmin"],
          code: z.ZodIssueCode.custom,
          message: "Login admin hanya tersedia melalui email",
        });
      }
    } else {
      if (!data.email) {
        ctx.addIssue({ path: ["email"], code: z.ZodIssueCode.custom, message: "Email wajib diisi" });
      }
      if (!data.password) {
        ctx.addIssue({ path: ["password"], code: z.ZodIssueCode.custom, message: "Password wajib diisi" });
      }
    }
  });

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeIndoPhone(raw: string | undefined | null) {
  if (!raw) return "";
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0")) s = "62" + s.slice(1);
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    return res.status(400).json({ error: message });
  }

  const { method: rawMethod, email, password, phone, requireAdmin } = parsed.data;
  const loginMethod = rawMethod ?? (phone && !email ? "phone" : "email");

  try {
    await dbConnect();

    if (loginMethod === "phone") {
      const normalizedPhone = normalizeIndoPhone(phone);
      const user = await User.findOne({ phone: normalizedPhone });
      if (!user) {
        return res.status(401).json({ error: "Nomor WhatsApp belum terdaftar" });
      }
      if (user.role === "admin") {
        return res.status(403).json({ error: "Admin wajib login menggunakan email dan password" });
      }

      const code = generateOtp();
      if (isDevEnv()) {
        console.info("[DEV] Generated OTP", { email: user.email, phone: normalizedPhone, code });
      }

      user.otpCode = await bcrypt.hash(code, 10);
      user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      user.otpAttempts = 0;
      await user.save();

      await sendOtpMessage(normalizedPhone, code);

      return res.status(200).json({
        mfaRequired: true,
        email: user.email,
        phone: normalizedPhone,
        method: "phone",
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
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

    if (user.role === "admin") {
      const session = {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: normalizeIndoPhone(user.phone),
        role: user.role,
      };
      createSession(res, session);
      return res.status(200).json({ success: true, user: session });
    }

    if (user.mfaEnabled) {
      const normalizedPhone = normalizeIndoPhone(user.phone);
      if (!/^62\d{7,15}$/.test(normalizedPhone)) {
        return res.status(422).json({
          error:
            "Nomor WhatsApp untuk MFA belum valid. Perbarui nomor di profil atau matikan MFA sementara untuk dapat login.",
        });
      }

      const code = generateOtp();
      if (isDevEnv()) {
        console.info("[DEV] Generated OTP", { email: user.email, phone: normalizedPhone, code });
      }

      user.otpCode = await bcrypt.hash(code, 10);
      user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      user.otpAttempts = 0;
      await user.save();

      await sendOtpMessage(normalizedPhone, code);

      return res.status(200).json({
        mfaRequired: true,
        email: user.email,
        phone: normalizedPhone,
        method: "email",
      });
    }

    const session = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: normalizeIndoPhone(user.phone),
      role: user.role,
    };
    createSession(res, session);
    return res.status(200).json({ success: true, user: session });
  } catch (error) {
    console.error("Login error", error);
    return res.status(500).json({ error: "Gagal memproses login" });
  }
}
