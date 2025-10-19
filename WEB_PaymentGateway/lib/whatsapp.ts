const API_VERSION = "v19.0";

type WhatsappTextPayload = {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: {
    body: string;
  };
};

async function sendWhatsAppRequest(payload: WhatsappTextPayload): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn("WhatsApp Cloud API not configured. Skipping send.");
    return true;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.error("Failed to send WhatsApp message", await response.text());
  }

  return response.ok;
}

export async function sendWhatsAppText(phone: string, message: string) {
  const body: WhatsappTextPayload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: {
      body: message
    }
  };

  return sendWhatsAppRequest(body);
}

export async function sendWhatsAppOtp({ phone, code }: { phone: string; code: string }) {
  const message = `Kode OTP login Anda: ${code}\nBerlaku 5 menit. Jangan bagikan ke siapa pun.`;
  return sendWhatsAppText(phone, message);
}

export async function sendCheckoutNotification({
  phone,
  order
}: {
  phone: string;
  order: { _id: string; items: Array<{ name: string; quantity: number }>; total: number; status: string };
}) {
  const itemsText = order.items.map((item) => `• ${item.name} x${item.quantity}`).join("\n");
  const message = `Terima kasih! Order #${order._id}\n${itemsText}\nTotal: Rp ${order.total.toLocaleString("id-ID")}\nStatus: ${order.status}\nInstruksi pembayaran: Silakan lakukan pembayaran ke rekening resmi kami.`;
  return sendWhatsAppText(phone, message);
}

export async function sendPaidNotification({
  phone,
  order
}: {
  phone: string;
  order: { _id: string };
}) {
  const message = `Pembayaran untuk Order #${order._id} telah diterima. Pesanan sedang diproses. Terima kasih!`;
  return sendWhatsAppText(phone, message);
}
