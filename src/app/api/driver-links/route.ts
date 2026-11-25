import { z } from "zod";
import { apiError, requireActive } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { rateLimit } from "@/lib/server/ratelimit";
import { LINK_ID, type DriverLinkItem } from "@/lib/app-data";

const MAX_D = 200_000;

const body = z.object({
  id: z.string().regex(LINK_ID),
  tripName: z.string().trim().max(160).default(""),
  from: z.string().trim().max(120).default(""),
  to: z.string().trim().max(120).default(""),
  km: z.number().nonnegative().max(20000).default(0),
  dep: z.string().max(40).optional(),
  arr: z.string().max(40).optional(),
  driver: z.string().trim().max(80).optional(),
  channel: z.enum(["whatsapp", "viber", "email", "sms", "copy", "share", "qr", "open"]).optional(),
  d: z.string().max(MAX_D).regex(/^[zj][A-Za-z0-9_-]+$/),
});

/** a felhasználó elküldött sofőr-linkjei (legújabb elöl) */
export async function GET() {
  try {
    const u = await requireActive();
    const { DriverLink } = await getDb();
    const rows = await DriverLink.find({ userId: u._id }).sort({ sentAt: -1 }).limit(300).lean();
    const links: DriverLinkItem[] = rows.map((r) => ({
      id: r._id, tripName: r.tripName, from: r.from, to: r.to, km: r.km, dep: r.dep, arr: r.arr, driver: r.driver, channel: r.channel,
      sentAt: new Date(r.sentAt).toISOString(), opens: r.opens ?? 0, d: r.d,
      firstOpenedAt: r.firstOpenedAt ? new Date(r.firstOpenedAt).toISOString() : undefined,
      lastOpenedAt: r.lastOpenedAt ? new Date(r.lastOpenedAt).toISOString() : undefined,
    }));
    return Response.json({ links }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}

/** küldéskor (WhatsApp, Viber, e-mail, másolás…) a tervező regisztrálja a linket; ugyanaz az azonosító = frissítés */
export async function POST(req: Request) {
  try {
    const u = await requireActive();
    if (!(await rateLimit(`dlink:${u._id}`, 120, 3600)).ok) return Response.json({ error: "Túl sok küldés, próbáld később." }, { status: 429 });
    const text = await req.text();
    if (text.length > MAX_D + 4000) return Response.json({ error: "Túl nagy útvonal-adat." }, { status: 413 });
    const b = body.parse(JSON.parse(text || "{}"));
    const { DriverLink } = await getDb();
    const existing = await DriverLink.findById(b.id).select("userId").lean();
    if (existing && String(existing.userId) !== String(u._id)) return Response.json({ error: "Ütköző azonosító." }, { status: 409 });
    await DriverLink.updateOne(
      { _id: b.id },
      {
        $set: { tripName: b.tripName, from: b.from, to: b.to, km: b.km, dep: b.dep, arr: b.arr, d: b.d, sentAt: new Date(),
          ...(b.driver !== undefined ? { driver: b.driver } : {}), ...(b.channel ? { channel: b.channel } : {}) },
        $setOnInsert: { userId: u._id, opens: 0, createdAt: new Date() },
      },
      { upsert: true },
    );
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
