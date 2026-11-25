import ReportView, { type ReportTrip } from "@/components/app/ReportView";
import { PageHead } from "@/components/app/RouteNet";
import { tripEnds } from "@/components/app/TripCard";
import type { FleetItem } from "@/components/Planner";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export const metadata = { title: "Kimutatás" };

const sig = (v: unknown) => JSON.stringify(Object.entries((v ?? {}) as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));

export default async function ReportsPage() {
  const u = (await getUser())!;
  const { Trip, Settings } = await getDb();
  const [rows, settings] = await Promise.all([
    Trip.find({ userId: u._id }).sort({ createdAt: -1 }).limit(2000).select("name summary waypoints vehicle options createdAt").lean(),
    Settings.findOne({ userId: u._id }).select("data.fleet").lean(),
  ]);
  const fleet = (settings?.data?.fleet as FleetItem[] | undefined) ?? [];
  const fleetSig = new Map(fleet.map((f) => [sig(f.v), f.name]));
  const trips: ReportTrip[] = rows.map((t) => {
    const v = t.vehicle as { weight?: number; euro?: string };
    const dep = (t.options as { departure?: string })?.departure;
    const s = t.summary;
    return {
      id: String(t._id), name: t.name, ...tripEnds(t.waypoints),
      // a fuvar napja: a tervezett indulás, ha van, különben a mentés napja
      date: dep && /^\d{4}-\d{2}-\d{2}/.test(dep) ? dep.slice(0, 10) : new Date(t.createdAt).toISOString().slice(0, 10),
      km: s.distanceKm ?? 0, toll: s.tollEur ?? 0, total: s.totalEur ?? 0,
      fuel: s.fuelEur, driver: s.driverEur, vehicleCost: s.vehicleEur, ferry: s.ferryEur,
      countries: s.countries ?? [],
      vehicle: fleetSig.get(sig(t.vehicle)) ?? (v?.weight ? `${String(v.weight).replace(".", ",")} t jármű` : "Ismeretlen jármű"),
    };
  });
  return (
    <div className="space-y-8">
      <PageHead kicker="Költségek, útdíjak, kilométerek" title="Kimutatás" sub="A mentett fuvaraid összesítve: járművenként, útvonalanként és országonként, Excelbe exportálható táblázattal a könyveléshez és a vezetőségnek." />
      <ReportView trips={trips} company={u.company ?? u.name} />
    </div>
  );
}
