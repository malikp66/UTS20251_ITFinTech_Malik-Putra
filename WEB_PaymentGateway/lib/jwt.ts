import crypto from "crypto";

function base64UrlEncode(input: string | Buffer): string {
  const raw = typeof input === "string" ? Buffer.from(input) : input;
  return raw
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

export type JwtPayload = Record<string, unknown> & {
  exp: number;
  iat: number;
};

export function signJwt(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds } as JwtPayload;
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(data).digest();
  const encodedSignature = base64UrlEncode(signature);
  return `${data}.${encodedSignature}`;
}

export function verifyJwt<T extends Record<string, unknown>>(token: string, secret: string): (T & { exp: number; iat: number }) | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedBuffer = crypto.createHmac("sha256", secret).update(data).digest();
  const providedBuffer = base64UrlDecode(signature);
  if (expectedBuffer.length !== providedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null;
  }
  try {
    const payloadBuffer = base64UrlDecode(encodedPayload);
    const parsed = JSON.parse(payloadBuffer.toString()) as T & { exp: number; iat: number };
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp && parsed.exp < now) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse JWT", error);
    return null;
  }
}
