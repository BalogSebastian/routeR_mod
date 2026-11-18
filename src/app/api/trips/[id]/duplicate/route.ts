import { apiError, requireActive } from "@/lib/server/auth";
import { getDb, isOid } from "@/lib/server/models";

type Ctx = { params: Promise<{ id: string }> };

/** fuvar duplikálása (csak a sajátodat): „… (másolat)” névvel, kedvenc jelölés nélkül */
export async function POST(_: Request, { params }: Ctx) {
  try {
    const u = await requireActive();
    const { id } = await params;
    if (!isOid(id)) return Response.json({ error: "Nincs ilyen fuvar." }, { status: 404 });
    const { Trip } = await getDb();
    const src = await Trip.findOne({ _id: id, userId: u._id }).lean();
    if (!src) return Response.json({ error: "Nincs ilyen fuvar." }, { status: 404 });
    if ((await Trip.countDocuments({ userId: u._id })) >= 500) return Response.json({ error: "Elérted a 500 mentett fuvar korlátját." }, { status: 409 });
    const base = src.name.replace(/ \(másolat( \d+)?\)$/, "");
    const name = `${base} (másolat)`.slice(0, 120);
    const copy = await Trip.create({ name, waypoints: src.waypoints, vehicle: src.vehicle, options: src.options, summary: src.summary, userId: u._id });
    return Response.json({ id: String(copy._id), name: copy.name });
  } catch (e) {
    return apiError(e);
  }
}
