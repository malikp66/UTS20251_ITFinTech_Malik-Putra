import { NextApiRequest, NextApiResponse } from "next";
import { getCookie, setCookie, clearCookie } from "@/lib/cookies";
import { signJwt, verifyJwt } from "@/lib/jwt";
import User, { UserDocument } from "@/models/User";
import { dbConnect } from "@/lib/db";

export type SessionPayload = {
  userId: string;
  email: string;
  role: "admin" | "customer";
  name: string;
};

type PendingPayload = {
  userId: string;
};

export const SESSION_COOKIE_NAME = "app_session";
export const PENDING_COOKIE_NAME = "app_pending";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari
export const PENDING_MAX_AGE = 60 * 10; // 10 menit

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET belum dikonfigurasi");
  }
  return secret;
}

export function setSessionCookie(res: NextApiResponse, payload: SessionPayload) {
  const token = signJwt(payload, getJwtSecret(), SESSION_MAX_AGE);
  setCookie(res, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });
  clearCookie(res, PENDING_COOKIE_NAME);
}

export function setPendingCookie(res: NextApiResponse, payload: PendingPayload) {
  const token = signJwt(payload, getJwtSecret(), PENDING_MAX_AGE);
  setCookie(res, PENDING_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_MAX_AGE
  });
}

export function clearSession(res: NextApiResponse) {
  clearCookie(res, SESSION_COOKIE_NAME);
  clearCookie(res, PENDING_COOKIE_NAME);
}

export function getPendingSession(req: NextApiRequest): PendingPayload | null {
  const token = getCookie(req, PENDING_COOKIE_NAME);
  if (!token) {
    return null;
  }
  return verifyJwt<PendingPayload>(token, getJwtSecret());
}

export function getSession(req: NextApiRequest): SessionPayload | null {
  const token = getCookie(req, SESSION_COOKIE_NAME);
  if (!token) {
    return null;
  }
  return verifyJwt<SessionPayload>(token, getJwtSecret());
}

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse): Promise<UserDocument | null> {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Tidak terautentikasi" });
    return null;
  }
  if (session.role !== "admin") {
    res.status(403).json({ error: "Tidak memiliki akses" });
    return null;
  }
  await dbConnect();
  const user = await User.findById(session.userId);
  if (!user) {
    res.status(401).json({ error: "Sesi tidak valid" });
    return null;
  }
  return user;
}

export async function requireUser(req: NextApiRequest, res: NextApiResponse): Promise<UserDocument | null> {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Tidak terautentikasi" });
    return null;
  }
  await dbConnect();
  const user = await User.findById(session.userId);
  if (!user) {
    res.status(401).json({ error: "Sesi tidak valid" });
    return null;
  }
  return user;
}
