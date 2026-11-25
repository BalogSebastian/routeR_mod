import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { LINK_ID } from "@/lib/app-data";

type Ctx = { params: Promise<{ id: string }> };

/**
 * A sofőr-oldal megnyitásakor hív ide (belépés nélkül). Csak a megnyitás tényét és idejét rögzítjük:
 * IP-címet, eszközt, helyadatot nem tárolunk. A link tulajdonosának saját megnyitása nem számít.
 */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!LINK_ID.test(id)) return new Response(null, { status: 204 });
    if (!(await rateLimit(`dlopen:${clientIp(_req)}`, 60, 3600)).ok) return new Response(null, { status: 204 });
    const { DriverLink } = await getDb();
    const link = await DriverLink.findById(id).select("userId").lean();
    if (!link) return new Response(null, { status: 204 });
    const me = await getUser().catch(() => null);
    if (me && String(me._id) === String(link.userId)) return new Response(null, { status: 204 });
    const now = new Date();
    await DriverLink.updateOne({ _id: id }, { $inc: { opens: 1 }, $set: { lastOpenedAt: now } });
    await DriverLink.updateOne({ _id: id, firstOpenedAt: { $exists: false } }, { $set: { firstOpenedAt: now } });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
