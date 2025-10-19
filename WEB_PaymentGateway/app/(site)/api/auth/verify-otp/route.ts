import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import User from "@/models/User";

const verifySchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6)
  })
  .transform((data) => ({
    email: data.email.trim().toLowerCase(),
    code: data.code.trim()
  }));

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findOne({ email: parsed.data.email });
  if (!user) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  if (!user.otpCodeHash || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
    return NextResponse.json({ error: "OTP_EXPIRED" }, { status: 400 });
  }

  const match = await bcrypt.compare(parsed.data.code, user.otpCodeHash);
  if (!match) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  user.otpCodeHash = null;
  user.otpExpiry = null;
  await user.save();

  return NextResponse.json({ success: true });
}
