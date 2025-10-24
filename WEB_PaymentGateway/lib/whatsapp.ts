import Order, { OrderDocument } from "@/models/Order";
import { getAppEnv, isDevEnv } from "@/lib/env";

const META_WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

type WhatsAppProvider = {
  sendText(to: string, body: string, context?: Record<string, unknown>): Promise<void>;
  sendOtp?(phone: string, code: string): Promise<void>;
};

let providerInstance: WhatsAppProvider | null = null;

function getProvider(): WhatsAppProvider {
  if (!providerInstance) {
    providerInstance = createMetaProvider();
    console.info("[WhatsApp] Provider initialised", { provider: "meta" });
  }
  return providerInstance;
}

function normalizeDigits(phone: string): string {
  return phone.trim().replace(/[^0-9]/g, "");
}
function formatPhoneNumberInternational(phone: string): string {
  const digits = normalizeDigits(phone);
  if (!digits) throw new Error("Nomor telepon kosong");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}
function formatPhoneNumberE164(phone: string): string {
  const international = formatPhoneNumberInternational(phone);
  return international.startsWith("+") ? international : `+${international}`;
}

function getAccessToken() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN belum diset");
  return token;
}
function getPhoneNumberId() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error("WHATSAPP_PHONE_NUMBER_ID belum diset");
  return id;
}
function canSendMessages() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function createMetaProvider(): WhatsAppProvider {
  async function dispatchText(to: string, body: string, context: Record<string, unknown>) {
    const appEnv = getAppEnv();
    const formattedTo = formatPhoneNumberInternational(to);

    console.info("[WhatsApp][Meta] Preparing to send TEXT", { appEnv, to: formattedTo, ...context });

    if (!canSendMessages()) {
      console.warn("[WhatsApp][Meta] Credentials missing. Skipping send.", {
        hasAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
        hasPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
      });
      return;
    }

    const url = `https://graph.facebook.com/${META_WHATSAPP_API_VERSION}/${getPhoneNumberId()}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo,
      type: "text",
      text: { preview_url: false, body },
    };

    const startedAt = Date.now();
    let responseText: string | undefined;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      responseText = await response.text();
      if (!response.ok) {
        console.error("[WhatsApp][Meta] Failed to send text", {
          status: response.status,
          statusText: response.statusText,
          responseText,
          to: formattedTo,
          context,
        });
        throw new Error("Gagal mengirim pesan WhatsApp (text)");
      }

      let responseJson: unknown;
      try {
        responseJson = responseText ? JSON.parse(responseText) : undefined;
      } catch {
        responseJson = responseText;
      }

      console.info("[WhatsApp][Meta] Text sent OK", {
        tookMs: Date.now() - startedAt,
        response: responseJson,
        context,
      });
    } catch (err) {
      console.error("[WhatsApp][Meta] Unexpected error when sending text", {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
        responseText,
        to: formattedTo,
        context,
      });
      throw err;
    }
  }

  const sendText = (to: string, body: string) =>
    dispatchText(to, body, { type: "text", bodyPreview: body.slice(0, 80) });

  const sendOtp = async (phone: string, code: string) => {
    const body = composeOtp(code);
    await dispatchText(phone, body, { type: "otp" });
  };

  return { sendText, sendOtp };
}

function composeOtp(code: string) {
  return `Kode OTP Malik Gaming Store Anda: ${code}\nBerlaku 5 menit. Jangan bagikan kepada siapa pun.`;
}

function composeCheckout(order: OrderDocument) {
  const instructions =
    process.env.PAYMENT_INSTRUCTIONS || "Silakan selesaikan pembayaran sesuai petunjuk di invoice.";
  const itemLines = order.items
    .map((item) => `• ${item.name} x${item.quantity} @ ${item.price.toLocaleString("id-ID")}`)
    .join("\n");

  return [
    "🧾 *Pesanan Diterima*",
    `ID: ${order._id}`,
    "",
    "Detail:",
    itemLines,
    "Biaya Admin: Rp 2.000",
    `Total: Rp${order.total.toLocaleString("id-ID")}`,
    "",
    instructions,
  ].join("\n");
}

function composePaymentSuccess(order: OrderDocument) {
  return [
    "✅ *Pembayaran Diterima*",
    `ID Pesanan: ${order._id}`,
    `Total: Rp${order.total.toLocaleString("id-ID")}`,
    "",
    "Pesanan sedang diproses. Terima kasih!",
    "Jika ada pertanyaan, balas pesan ini.",
  ].join("\n");
}

export async function sendWhatsAppMessage(to: string, body: string) {
  const provider = getProvider();
  await provider.sendText(to, body);
}

export async function sendOtpMessage(phone: string, code: string) {
  const provider = getProvider();
  if (provider.sendOtp) {
    await provider.sendOtp(phone, code);
  } else {
    await provider.sendText(phone, composeOtp(code), { fallback: true });
  }
}

export async function sendCheckoutNotification(order: OrderDocument) {
  const body = composeCheckout(order);
  await sendWhatsAppMessage(order.buyer.phone, body);
}

export async function sendPaymentSuccessNotification(orderId: string) {
  const order = await Order.findById(orderId);
  if (!order) return;
  const body = composePaymentSuccess(order);
  await sendWhatsAppMessage(order.buyer.phone, body);
}
