import { GetServerSidePropsContext } from "next";
import { SESSION_COOKIE_NAME, SessionPayload } from "@/lib/auth";
import { verifyJwt } from "@/lib/jwt";

function parseCookie(header?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) {
    return result;
  }
  const pairs = header.split(/;\s*/);
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    result[key] = decodeURIComponent(rest.join("="));
  }
  return result;
}

export function getSessionFromContext(context: GetServerSidePropsContext): SessionPayload | null {
  const cookies = parseCookie(context.req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET belum dikonfigurasi");
  }
  return verifyJwt<SessionPayload>(token, secret);
}
