import { getDb } from "./models";

/** Elosztott, MongoDB-alapú fix ablakos limiter (TTL-index takarít). */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; resetIn: number }> {
  const { RateLimit } = await getDb();
  const now = Date.now();
  const win = Math.floor(now / (windowSec * 1000));
  const doc = await RateLimit.findOneAndUpdate(
    { _id: `${key}:${win}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((win + 1) * windowSec * 1000 + 5000) } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return { ok: (doc?.count ?? 1) <= limit, resetIn: Math.ceil(((win + 1) * windowSec * 1000 - now) / 1000) };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "ip";
}
