import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcrypt";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

function normalizeIndoPhone(raw: string) {
  if (!raw) return "";
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0")) s = "62" + s.slice(1);
  return s;
}

const registerSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter"),
  email: z.string().trim().email("Email tidak valid"),
  phone: z.string().trim().min(8, "Nomor WhatsApp tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  mfaEnabled: z.boolean().optional().default(false),
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

    const email = parsed.data.email.toLowerCase();
    const phone = normalizeIndoPhone(parsed.data.phone);

    if (!/^62\d{7,15}$/.test(phone)) {
      return res.status(400).json({ error: "Nomor WhatsApp tidak valid. Gunakan format 08xxx atau +628xxx." });
    }

    const [existing, existingPhone] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ phone }),
    ]);
    if (existing) {
      return res.status(409).json({ error: "Email sudah terdaftar" });
    }
    if (existingPhone) {
      return res.status(409).json({ error: "Nomor WhatsApp sudah terdaftar" });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await User.create({
      name: parsed.data.name,
      email,
      phone,
      passwordHash,
      role: "customer",
      mfaEnabled: !!parsed.data.mfaEnabled,
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Register error", error);
    return res.status(500).json({ error: "Gagal melakukan registrasi" });
  }
}
