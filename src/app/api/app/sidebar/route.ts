import { apiError, requireActive } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import type { MonthStat, SidebarData } from "@/lib/app-data";

/** a menü élő adatai: e havi / múlt havi számok, jóváhagyásra váró regisztrációk (admin), friss sofőr-megnyitások */
export async function GET() {
  try {
    const u = await requireActive();
    const { Trip, User, DriverLink } = await getDb();
    // a hónap határa közép-európai idő szerint
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", year: "numeric", month: "numeric" }).formatToParts(now).map((p) => [p.type, p.value]));
    const y = +parts.year, m = +parts.month - 1;
    const start = (yy: number, mm: number) => {
      const guess = new Date(Date.UTC(yy, mm, 1));
      const off = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", timeZoneName: "shortOffset" }).formatToParts(guess).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
      const h = Number(off.replace("GMT", "") || 0);
      return new Date(guess.getTime() - h * 3600_000);
    };
    const thisStart = start(y, m), prevStart = start(m === 0 ? y - 1 : y, (m + 11) % 12);
    const agg = (from: Date, to: Date) => Trip.aggregate<MonthStat>([
      { $match: { userId: u._id, createdAt: { $gte: from, $lt: to } } },
      { $group: { _id: null, n: { $sum: 1 }, km: { $sum: "$summary.roadKm" }, toll: { $sum: "$summary.tollEur" }, eur: { $sum: "$summary.totalEur" } } },
      { $project: { _id: 0, n: 1, km: 1, toll: 1, eur: 1 } },
    ]);
    // a múlt hónapot csak ugyanennyi napig vetjük össze (igazságos „eddig” összehasonlítás)
    const prevSame = new Date(Math.min(thisStart.getTime(), prevStart.getTime() + (now.getTime() - thisStart.getTime())));
    const empty: MonthStat = { n: 0, km: 0, toll: 0, eur: 0 };
    const [cur, prev, pending, opened24h] = await Promise.all([
      agg(thisStart, new Date(now.getTime() + 60_000)),
      agg(prevStart, prevSame),
      u.role === "admin" ? User.countDocuments({ status: "pending" }) : Promise.resolve(0),
      DriverLink.countDocuments({ userId: u._id, lastOpenedAt: { $gte: new Date(now.getTime() - 86400_000) } }),
    ]);
    const data: SidebarData = { month: cur[0] ?? empty, prev: prev[0] ?? empty, pending, opened24h };
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
