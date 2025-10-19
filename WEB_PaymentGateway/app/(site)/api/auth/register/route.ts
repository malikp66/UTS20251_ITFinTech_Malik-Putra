import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import User from "@/models/User";

const registerSchema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Email tidak valid"),
    phone: z.string().min(8, "Nomor WA wajib diisi"),
    password: z.string().min(6, "Password minimal 6 karakter")
  })
  .transform((data) => ({
    ...data,
    email: data.email.trim().toLowerCase(),
    name: data.name.trim(),
    phone: data.phone.trim()
  }));

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, password } = parsed.data;

  await dbConnect();
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: "customer"
  });

  return NextResponse.json({ success: true });
}
