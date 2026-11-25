import QuoteBuilder, { type QuoteTrip } from "@/components/app/QuoteBuilder";
import { PageHead } from "@/components/app/RouteNet";
import { tripEnds } from "@/components/app/TripCard";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export const metadata = { title: "Árajánlat" };

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const u = (await getUser())!;
  const { trip } = await searchParams;
  const { Trip, Settings } = await getDb();
  const [rows, settings] = await Promise.all([
    Trip.find({ userId: u._id }).sort({ updatedAt: -1 }).limit(200).select("name summary waypoints vehicle options updatedAt").lean(),
    Settings.findOne({ userId: u._id }).select("data.costs").lean(),
  ]);
  const trips: QuoteTrip[] = rows.map((t) => ({
    id: String(t._id), name: t.name, ...tripEnds(t.waypoints), summary: JSON.parse(JSON.stringify(t.summary)),
    weight: Number((t.vehicle as { weight?: number })?.weight) || undefined,
    euro: (t.vehicle as { euro?: string })?.euro, hazmat: !!(t.vehicle as { hazmat?: boolean })?.hazmat,
    departure: (t.options as { departure?: string })?.departure,
  }));
  const eurHuf = Number((settings?.data?.costs as { eurHuf?: number } | undefined)?.eurHuf) || 390;
  return (
    <div className="space-y-8">
      <PageHead kicker="Ajánlat a megrendelőnek percek alatt" title="Árajánlat" sub="Válassz egy mentett fuvart: az önköltséget a tervező már kiszámolta. Add meg az árrést, és nyomtasd vagy mentsd PDF-ként a kész ajánlatot." />
      <QuoteBuilder trips={trips} initialTrip={trip} eurHuf={eurHuf} me={{ name: u.name, email: u.email, company: u.company ?? "", phone: u.phone ?? "" }} />
    </div>
  );
}
