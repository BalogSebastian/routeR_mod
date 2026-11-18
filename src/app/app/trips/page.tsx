import TripsList from "@/components/app/TripsList";
import { tripEnds, type TripListItem } from "@/components/app/TripCard";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export const metadata = { title: "Fuvaraim" };

export default async function TripsPage() {
  const u = (await getUser())!;
  const { Trip } = await getDb();
  const rows = await Trip.find({ userId: u._id }).sort({ updatedAt: -1 }).limit(200).select("name summary waypoints updatedAt").lean();
  const trips: TripListItem[] = rows.map((t) => ({ id: String(t._id), name: t.name, updatedAt: new Date(t.updatedAt).toISOString(), summary: t.summary, ...tripEnds(t.waypoints) }));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Mentett útvonalak és költségek</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Fuvaraim</h1>
      </div>
      <TripsList initial={trips} />
    </div>
  );
}
