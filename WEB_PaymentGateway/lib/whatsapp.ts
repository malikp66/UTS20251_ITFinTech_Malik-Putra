import Order, { OrderDocument } from "@/models/Order";
import { isDevEnv } from "@/lib/env";

const META_WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v17.0";

function getAccessToken() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    throw new Error("WHATSAPP_ACCESS_TOKEN belum diset");
  }
  return token;
}

function getPhoneNumberId() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID belum diset");
  }
  return id;
}

function canSendMessages() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppMessage(to: string, body: string) {
  if (isDevEnv()) {
    console.info("[DEV] WhatsApp message bypassed", { to, body });
    return;
  }
  if (!canSendMessages()) {
    console.warn("WhatsApp credentials missing. Skipping send.");
    return;
  }
  const url = `https://graph.facebook.com/${META_WHATSAPP_API_VERSION}/${getPhoneNumberId()}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: false,
      body
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to send WhatsApp message", text);
    throw new Error("Gagal mengirim pesan WhatsApp");
  }
}

export async function sendOtpMessage(phone: string, code: string) {
  const message = `Kode OTP UTS Fintech Anda: ${code}. Berlaku selama 5 menit. Jangan bagikan ke siapapun.`;
  await sendWhatsAppMessage(phone, message);
}

export async function sendCheckoutNotification(order: OrderDocument) {
  const instructions = process.env.PAYMENT_INSTRUCTIONS || "Silakan selesaikan pembayaran sesuai petunjuk di invoice.";
  const itemLines = order.items
    .map(item => `- ${item.name} x${item.quantity} @ ${item.price.toLocaleString("id-ID")}`)
    .join("\n");
  const body = [
    "Terima kasih telah berbelanja di Malik Gaming Store!",
    "Berikut detail pesanan Anda:",
    itemLines,
    `Total: Rp${order.total.toLocaleString("id-ID")}`,
    "",
    instructions
  ].join("\n");
  await sendWhatsAppMessage(order.buyer.phone, body);
}

export async function sendPaymentSuccessNotification(orderId: string) {
  const order = await Order.findById(orderId);
  if (!order) return;
  const body = [
    "Pembayaran kami terima. Terima kasih!",
    "Pesanan Anda sedang diproses dan akan segera kami tindaklanjuti.",
    `Total: Rp${order.total.toLocaleString("id-ID")}`,
    "Jika ada pertanyaan, balas pesan ini."
  ].join("\n");
  await sendWhatsAppMessage(order.buyer.phone, body);
}
