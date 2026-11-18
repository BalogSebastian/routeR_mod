import { apiError, requireActive } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

const MAX_BYTES = 400_000;
/** a tervező mentett beállításai (jármű, költségek, flotta, No-Go zónák, átkelők…) */
const KEYS = ["vehicle", "costs", "fleet", "defaultFleet", "noGo", "ferryOverrides", "flexRules", "waitBans", "crossings", "crossingsOff", "chDefault"];

export async function GET() {
  try {
    const u = await requireActive();
    const { Settings } = await getDb();
    const s = await Settings.findOne({ userId: u._id }).lean();
    return Response.json({ data: s?.data ?? {} });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const u = await requireActive();
    const text = await req.text();
    if (text.length > MAX_BYTES) return Response.json({ error: "Túl nagy beállítás-adat." }, { status: 413 });
    const body = JSON.parse(text) as Record<string, unknown>;
    const data = Object.fromEntries(Object.entries(body).filter(([k]) => KEYS.includes(k)));
    const { Settings } = await getDb();
    await Settings.updateOne({ userId: u._id }, { $set: { data } }, { upsert: true });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
