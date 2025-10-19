import bcrypt from "bcrypt";

import User from "@/models/User";
import { sendWhatsAppOtp } from "./whatsapp";

type LeanUser = {
  _id: string;
  phone: string;
};

export async function generateOtpForUser(user: LeanUser) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otpCode, 10);
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  await User.findByIdAndUpdate(user._id, {
    otpCodeHash: otpHash,
    otpExpiry: expiry
  });

  await sendWhatsAppOtp({ phone: user.phone, code: otpCode });
}
