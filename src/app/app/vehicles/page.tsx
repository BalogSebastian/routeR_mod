import { PageHead } from "@/components/app/RouteNet";
import VehiclesManager from "@/components/app/VehiclesManager";
import type { FleetItem } from "@/components/Planner";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export const metadata = { title: "Járműveim" };

/** a jármű-adatok összevetése a fuvarokkal (a kulcsok sorrendje ne számítson) */
const sig = (v: unknown) => JSON.stringify(Object.entries((v ?? {}) as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));

export default async function VehiclesPage() {
  const u = (await getUser())!;
  const { Settings, Trip } = await getDb();
  const [settings, trips] = await Promise.all([
    Settings.findOne({ userId: u._id }).lean(),
    Trip.find({ userId: u._id }).sort({ updatedAt: -1 }).limit(500).select("vehicle summary updatedAt").lean(),
  ]);
  const fleet = (settings?.data?.fleet as FleetItem[] | undefined) ?? [];
  const usage: Record<string, { n: number; km: number; last?: string }> = {};
  for (const f of fleet) {
    const s = sig(f.v);
    const mine = trips.filter((t) => sig(t.vehicle) === s);
    usage[f.id] = { n: mine.length, km: mine.reduce((a, t) => a + (t.summary?.roadKm ?? 0), 0), last: mine[0] ? new Date(mine[0].updatedAt).toISOString() : undefined };
  }
  return (
    <div className="space-y-8">
      <PageHead kicker="Flotta és alapértelmezett kamion" title="Járműveim" sub="A tervező ezekkel a méretekkel, tömeggel és EURO-osztállyal számolja az útvonalat és az útdíjat. A csillagos jármű töltődik be indításkor." />
      <VehiclesManager initialFleet={JSON.parse(JSON.stringify(fleet))} initialDefault={settings?.data?.defaultFleet as string | undefined} usage={usage} />
    </div>
  );
}
