import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { parse, serialize } from "cookie";
import { UserRole } from "@/models/User";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_TTL_HOURS = 24;

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
};

type JwtPayload = SessionUser & {
  exp: number;
  iat: number;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET belum diset di environment");
  }
  return secret;
}

export function createSession(res: NextApiResponse, user: SessionUser) {
  const secret = getSecret();
  const expiresInSeconds = SESSION_TTL_HOURS * 60 * 60;
  const token = jwt.sign(user, secret, { expiresIn: expiresInSeconds });
  const cookie = serialize(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresInSeconds
  });
  res.setHeader("Set-Cookie", cookie);
  return token;
}

export function destroySession(res: NextApiResponse) {
  const cookie = serialize(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  res.setHeader("Set-Cookie", cookie);
}

export function getSessionFromRequest(req: NextApiRequest): SessionUser | null {
  const cookiesHeader = req.headers.cookie;
  if (!cookiesHeader) {
    return null;
  }
  const parsed = parse(cookiesHeader);
  const token = parsed[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, getSecret()) as JwtPayload;
    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };
  } catch {
    return null;
  }
}

export function requireApiAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { adminOnly?: boolean } = {}
): SessionUser | null {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  if (options.adminOnly && session.role !== "admin") {
    res.status(403).json({ error: "Admin role required" });
    return null;
  }
  return session;
}

export function getSessionFromCookies(cookieHeader: string | undefined): SessionUser | null {
  if (!cookieHeader) return null;
  try {
    const parsed = parse(cookieHeader);
    const token = parsed[SESSION_COOKIE_NAME];
    if (!token) return null;
    const decoded = jwt.verify(token, getSecret()) as JwtPayload;
    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };
  } catch {
    return null;
  }
}

export function isAdminSession(session: SessionUser | null | undefined): boolean {
  return Boolean(session && session.role === "admin");
}
