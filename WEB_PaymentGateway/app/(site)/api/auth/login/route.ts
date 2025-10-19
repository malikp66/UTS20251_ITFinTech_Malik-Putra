import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import { generateOtpForUser } from "@/lib/auth-service";
import User from "@/models/User";

const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1)
  })
  .transform((data) => ({
    email: data.email.trim().toLowerCase(),
    password: data.password
  }));

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findOne({ email: parsed.data.email }).lean();

  if (!user || user.role !== "customer") {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  await generateOtpForUser({ _id: user._id.toString(), phone: user.phone });

  return NextResponse.json({ requiresOtp: true });
}
