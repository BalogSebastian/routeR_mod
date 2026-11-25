import PlacesManager from "@/components/app/PlacesManager";
import { PageHead } from "@/components/app/RouteNet";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { toPlaceItem } from "@/lib/server/places";

export const metadata = { title: "Helyeim" };

export default async function PlacesPage() {
  const u = (await getUser())!;
  const { Place } = await getDb();
  const rows = await Place.find({ userId: u._id }).sort({ uses: -1, name: 1 }).limit(500).lean();
  return (
    <div className="space-y-8">
      <PageHead kicker="Telephelyek, ügyfelek, rakodóhelyek" title="Helyeim" sub="Mentsd el egyszer a címet a fontos tudnivalókkal (nyitvatartás, rámpa, kapcsolattartó), és a tervezőben a nevét beírva elsőként kapod." />
      <PlacesManager initial={rows.map(toPlaceItem)} />
    </div>
  );
}
