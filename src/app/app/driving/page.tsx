import DrivingTool from "@/components/app/DrivingTool";
import { PageHead } from "@/components/app/RouteNet";
import { tripEnds } from "@/components/app/TripCard";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export const metadata = { title: "Vezetési idő" };

export default async function DrivingPage() {
  const u = (await getUser())!;
  const { Trip } = await getDb();
  const rows = await Trip.find({ userId: u._id }).sort({ updatedAt: -1 }).limit(60).select("name summary.drivingMin summary.distanceKm waypoints").lean();
  const trips = rows.map((t) => ({ id: String(t._id), label: `${tripEnds(t.waypoints).from} → ${tripEnds(t.waypoints).to} · ${Math.round(t.summary?.distanceKm ?? 0)} km`, min: Math.round(t.summary?.drivingMin ?? 0) }));
  return (
    <div className="space-y-8">
      <PageHead kicker="EU 561/2006 · szünetek és pihenők" title="Vezetési idő" sub="Mennyit vezethet még ma a sofőr, mikor kell megállnia, és ha most elindul, mikor ér oda szabályosan. Tájékoztató számítás: a tachográf adatai a mérvadók." />
      <DrivingTool trips={trips} />
    </div>
  );
}
