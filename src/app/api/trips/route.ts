import { tripSchema } from "@/lib/server/trip-schema";
import { apiError, requireActive } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export async function GET() {
  try {
    const u = await requireActive();
    const { Trip } = await getDb();
    const trips = await Trip.find({ userId: u._id }).sort({ updatedAt: -1 }).limit(200).select("name summary waypoints createdAt updatedAt").lean();
    return Response.json({ trips });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireActive();
    const input = tripSchema.parse(await req.json().catch(() => ({})));
    const { Trip } = await getDb();
    if ((await Trip.countDocuments({ userId: u._id })) >= 500) return Response.json({ error: "Elérted a 500 mentett fuvar korlátját." }, { status: 409 });
    const t = await Trip.create({ ...input, userId: u._id });
    return Response.json({ id: String(t._id) });
  } catch (e) {
    return apiError(e);
  }
}
