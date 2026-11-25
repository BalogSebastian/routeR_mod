import DriverLinks from "@/components/app/DriverLinks";
import { PageHead } from "@/components/app/RouteNet";
import type { DriverLinkItem } from "@/lib/app-data";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export const metadata = { title: "Sofőr-linkek" };

export default async function DriversPage() {
  const u = (await getUser())!;
  const { DriverLink } = await getDb();
  const rows = await DriverLink.find({ userId: u._id }).sort({ sentAt: -1 }).limit(300).lean();
  const links: DriverLinkItem[] = rows.map((r) => ({
    id: r._id, tripName: r.tripName, from: r.from, to: r.to, km: r.km, dep: r.dep, arr: r.arr, driver: r.driver, channel: r.channel,
    sentAt: new Date(r.sentAt).toISOString(), opens: r.opens ?? 0, d: r.d,
    firstOpenedAt: r.firstOpenedAt ? new Date(r.firstOpenedAt).toISOString() : undefined,
    lastOpenedAt: r.lastOpenedAt ? new Date(r.lastOpenedAt).toISOString() : undefined,
  }));
  return (
    <div className="space-y-8">
      <PageHead kicker="Elküldött útvonalak követése" title="Sofőr-linkek" sub="Minden útvonal, amit a tervezőből WhatsAppon, Viberen, e-mailben vagy SMS-ben a sofőrnek küldtél, és hogy megnyitotta-e már." />
      <DriverLinks initial={links} />
    </div>
  );
}
