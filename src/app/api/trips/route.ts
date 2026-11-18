import { z } from "zod";
import { apiError, requireActive } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export const tripSchema = z.object({
  name: z.string().trim().min(1, "Adj nevet a fuvarnak.").max(120),
  waypoints: z.array(z.object({
    lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), label: z.string().max(200),
    via: z.boolean().optional(), ferry: z.string().max(60).optional(), cargo: z.string().max(10).optional(),
  })).min(2).max(14),
  vehicle: z.record(z.string(), z.unknown()),
  options: z.record(z.string(), z.unknown()),
  summary: z.object({
    distanceKm: z.number(), roadKm: z.number(), tollEur: z.number(), totalEur: z.number(), drivingMin: z.number(),
    days: z.number(), arrival: z.string().max(40), countries: z.array(z.string().max(4)).max(30), roads: z.array(z.string().max(30)).max(40),
  }),
});

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
