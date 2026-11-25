import { apiError, requireActive } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { placeBody, toPlaceItem } from "@/lib/server/places";

export async function GET() {
  try {
    const u = await requireActive();
    const { Place } = await getDb();
    const rows = await Place.find({ userId: u._id }).sort({ uses: -1, name: 1 }).limit(500).lean();
    return Response.json({ places: rows.map(toPlaceItem) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireActive();
    const b = placeBody.parse(await req.json().catch(() => ({})));
    const { Place } = await getDb();
    if ((await Place.countDocuments({ userId: u._id })) >= 500) return Response.json({ error: "Legfeljebb 500 helyet menthetsz." }, { status: 409 });
    const p = await Place.create({ ...b, userId: u._id });
    return Response.json({ place: toPlaceItem(p.toObject()) });
  } catch (e) {
    return apiError(e);
  }
}
