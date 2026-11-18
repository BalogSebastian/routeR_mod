import { redirect } from "next/navigation";
import PlannerLoader from "@/components/PlannerLoader";
import type { InitialTrip, Saved } from "@/components/Planner";
import { getUser } from "@/lib/server/auth";
import { getDb, isOid } from "@/lib/server/models";

export const metadata = { title: "Útvonaltervező" };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.status !== "active") redirect("/wait");
  const { trip } = await searchParams;
  const { Settings, Trip } = await getDb();
  const [settings, t] = await Promise.all([
    Settings.findOne({ userId: u._id }).lean(),
    trip && isOid(trip) ? Trip.findOne({ _id: trip, userId: u._id }).lean() : null,
  ]);
  const initialTrip: InitialTrip | null = t
    ? JSON.parse(JSON.stringify({ id: String(t._id), name: t.name, waypoints: t.waypoints, vehicle: t.vehicle, options: t.options }))
    : null;
  return <PlannerLoader initialSaved={JSON.parse(JSON.stringify(settings?.data ?? {})) as Saved} initialTrip={initialTrip} />;
}
