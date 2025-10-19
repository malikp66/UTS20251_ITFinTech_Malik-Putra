import { CheckoutDocument } from "@/models/Checkout";

type WhatsAppConfig = {
  apiUrl: string;
  token: string;
  phoneNumberId: string;
};

function getConfig(): WhatsAppConfig | null {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!apiUrl || !token || !phoneNumberId) {
    console.warn("WhatsApp API belum dikonfigurasi. Lewati pengiriman pesan.");
    return null;
  }
  return { apiUrl, token, phoneNumberId };
}

export async function sendWhatsAppMessage(to: string, message: string) {
  const config = getConfig();
  if (!config) {
    return;
  }
  try {
    const url = `${config.apiUrl}/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message }
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gagal mengirim pesan WhatsApp", errorBody);
    }
  } catch (error) {
    console.error("Kesalahan saat mengirim pesan WhatsApp", error);
  }
}

export function buildCheckoutSummary(order: CheckoutDocument): string {
  const lines = [
    "Terima kasih atas pesanan Anda!",
    "",
    "Detail pesanan:",
    ...order.items.map((item) => `- ${item.name} x${item.qty} = Rp ${item.subtotal.toLocaleString("id-ID")}`),
    "",
    `Total: Rp ${order.total.toLocaleString("id-ID")}`
  ];
  return lines.join("\n");
}

export function buildPaymentConfirmation(order: CheckoutDocument): string {
  const lines = [
    "Pembayaran Anda telah kami terima.",
    "",
    "Pesanan segera kami proses.",
    `Total pembayaran: Rp ${order.total.toLocaleString("id-ID")}`
  ];
  return lines.join("\n");
}
