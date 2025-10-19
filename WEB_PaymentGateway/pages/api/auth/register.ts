import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/passwords";
import { validateRegistrationInput } from "@/lib/validation";
import { normalizePhoneNumber } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }
  const validation = validateRegistrationInput(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  const { name, email, phone, password } = validation.data;
  await dbConnect();
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "Email sudah terdaftar" });
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email,
    phone: normalizePhoneNumber(phone),
    passwordHash,
    role: "customer"
  });
  return res.status(201).json({
    message: "Registrasi berhasil",
    data: { id: user._id.toString(), email: user.email }
  });
}
