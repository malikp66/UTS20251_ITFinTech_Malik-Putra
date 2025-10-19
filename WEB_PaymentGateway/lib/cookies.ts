import { NextApiRequest, NextApiResponse } from "next";

type CookieOptions = {
  httpOnly?: boolean;
  path?: string;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  maxAge?: number;
};

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const encoded = encodeURIComponent(value);
  const segments: string[] = [`${name}=${encoded}`];
  const path = options.path ?? "/";
  segments.push(`Path=${path}`);
  if (options.httpOnly) {
    segments.push("HttpOnly");
  }
  if (options.secure) {
    segments.push("Secure");
  }
  const sameSite = options.sameSite ?? "lax";
  segments.push(`SameSite=${sameSite}`);
  if (typeof options.maxAge === "number") {
    segments.push(`Max-Age=${Math.max(0, options.maxAge)}`);
  }
  return segments.join("; ");
}

export function setCookie(res: NextApiResponse, name: string, value: string, options: CookieOptions = {}) {
  const serialized = serializeCookie(name, value, options);
  const existing = res.getHeader("Set-Cookie");
  if (existing) {
    if (Array.isArray(existing)) {
      res.setHeader("Set-Cookie", [...existing, serialized]);
    } else {
      res.setHeader("Set-Cookie", [existing.toString(), serialized]);
    }
  } else {
    res.setHeader("Set-Cookie", serialized);
  }
}

export function clearCookie(res: NextApiResponse, name: string) {
  setCookie(res, name, "", { path: "/", httpOnly: true, maxAge: 0 });
}

export function getCookie(req: NextApiRequest, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) {
    return undefined;
  }
  const cookies = header.split(/;\s*/);
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}
