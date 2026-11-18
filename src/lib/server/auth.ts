import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb, isOid, type IUser } from "./models";

export interface RouterSession { userId?: string; ver?: number }

import { SESSION_COOKIE } from "./session-cookie";

export function sessionOptions(): SessionOptions {
  const password = process.env.ROUTER_SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("ROUTER_SESSION_SECRET (min. 32 karakter) szükséges.");
  return {
    password,
    cookieName: SESSION_COOKIE,
    ttl: 60 * 60 * 24 * 14,
    cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", path: "/" },
  };
}

export async function getSession() {
  return getIronSession<RouterSession>(await cookies(), sessionOptions());
}

/** a bejelentkezett felhasználó (bármilyen státusszal), vagy null */
export async function getUser(): Promise<IUser | null> {
  const s = await getSession();
  if (!s.userId || !isOid(s.userId)) return null;
  const { User } = await getDb();
  const user = await User.findById(s.userId).lean();
  if (!user || user.status === "blocked" || user.sessionVersion !== (s.ver ?? 0)) return null;
  return user;
}

/** a jóváhagyott (aktív) felhasználó, vagy null */
export async function getActiveUser(): Promise<IUser | null> {
  const u = await getUser();
  return u && u.status === "active" ? u : null;
}

export async function startSession(user: IUser) {
  const s = await getSession();
  s.userId = String(user._id);
  s.ver = user.sessionVersion;
  await s.save();
}

export async function endSession() {
  (await getSession()).destroy();
}

export const passwordSchema = z.string().min(8, "A jelszó legalább 8 karakter legyen.").max(128);
export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);
let dummy: Promise<string> | null = null;
/** időzítés-kiegyenlítés: nem létező felhasználónál is lefut egy bcrypt-összehasonlítás */
export const dummyHash = () => (dummy ??= bcrypt.hash("router-dummy-password", 12));

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** API-végpontokhoz: aktív felhasználó kell, különben 401 / 403 */
export async function requireActive(): Promise<IUser> {
  const u = await getUser();
  if (!u) throw new ApiError(401, "Jelentkezz be.");
  if (u.status !== "active") throw new ApiError(403, "A fiókod még nincs jóváhagyva.");
  return u;
}

export async function requireAdmin(): Promise<IUser> {
  const u = await requireActive();
  if (u.role !== "admin") throw new ApiError(403, "Nincs jogosultságod.");
  return u;
}

export function apiError(e: unknown): Response {
  if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof z.ZodError) return Response.json({ error: e.issues[0]?.message ?? "Hibás adat." }, { status: 422 });
  console.error(e);
  return Response.json({ error: "Váratlan szerverhiba." }, { status: 500 });
}

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
