import type { NextApiRequest, NextApiResponse } from "next";

const VERIFY_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

type WhatsAppWebhookMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: unknown;
  statuses?: unknown;
};

type WhatsAppWebhookEntry = {
  id?: string;
  changes?: Array<{
    field?: string;
    value?: {
      messaging_product?: string;
      metadata?: unknown;
      contacts?: unknown;
      messages?: WhatsAppWebhookMessage[];
      statuses?: unknown[];
    };
  }>;
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: WhatsAppWebhookEntry[];
};

function logWebhookPayload(payload: WhatsAppWebhookPayload) {
  const entries = payload.entry ?? [];
  entries.forEach((entry, index) => {
    console.info("[WhatsAppWebhook] Entry", {
      index,
      entryId: entry.id,
      changeCount: entry.changes?.length ?? 0
    });
    entry.changes?.forEach((change, changeIndex) => {
      const messages = change.value?.messages ?? [];
      const statuses = change.value?.statuses ?? [];
      console.info("[WhatsAppWebhook] Change", {
        entryIndex: index,
        changeIndex,
        field: change.field,
        messagingProduct: change.value?.messaging_product,
        messages: messages.map(message => ({
          id: message.id,
          from: message.from,
          type: message.type,
          text: message.text?.body?.slice(0, 120),
          button: message.button,
          timestamp: message.timestamp
        })),
        statuses
      });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (!VERIFY_TOKEN) {
      console.error("[WhatsAppWebhook] VERIFY_TOKEN tidak tersedia di environment");
      return res.status(500).json({ error: "WhatsApp webhook belum dikonfigurasi" });
    }

    if (mode === "subscribe" && token === VERIFY_TOKEN && typeof challenge === "string") {
      console.info("[WhatsAppWebhook] Verification successful");
      return res.status(200).send(challenge);
    }

    console.warn("[WhatsAppWebhook] Verification failed", {
      mode,
      tokenMatched: token === VERIFY_TOKEN
    });
    return res.status(403).json({ error: "Token verifikasi tidak valid" });
  }

  if (req.method === "POST") {
    const payload = req.body as WhatsAppWebhookPayload;
    console.info("[WhatsAppWebhook] Incoming event", {
      hasEntries: Boolean(payload.entry && payload.entry.length),
      object: payload.object
    });
    try {
      logWebhookPayload(payload);
    } catch (err) {
      console.error("[WhatsAppWebhook] Gagal mencatat payload", err);
    }
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end();
}
