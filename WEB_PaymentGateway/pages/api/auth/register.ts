import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcrypt";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

const registerSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter"),
  email: z.string().trim().email("Email tidak valid"),
  phone: z.string().trim().min(8, "Nomor WhatsApp tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter")
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map(issue => issue.message).join(", ");
      return res.status(400).json({ error: message });
    }
    await dbConnect();
    const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email sudah terdaftar" });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await User.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      passwordHash,
      role: "customer"
    });
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Register error", error);
    return res.status(500).json({ error: "Gagal melakukan registrasi" });
  }
}
