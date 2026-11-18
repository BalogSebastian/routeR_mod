import Link from "next/link";
import TripCard, { tripEnds, type TripListItem } from "@/components/app/TripCard";
import { eur, km } from "@/lib/format";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export default async function Dashboard() {
  const u = (await getUser())!;
  const { Trip, Settings } = await getDb();
  const [recent, agg, settings] = await Promise.all([
    Trip.find({ userId: u._id }).sort({ updatedAt: -1 }).limit(6).select("name summary waypoints updatedAt").lean(),
    Trip.aggregate<{ n: number; km: number; eur: number; toll: number }>([
      { $match: { userId: u._id } },
      { $group: { _id: null, n: { $sum: 1 }, km: { $sum: "$summary.roadKm" }, eur: { $avg: "$summary.totalEur" }, toll: { $sum: "$summary.tollEur" } } },
    ]),
    Settings.findOne({ userId: u._id }).lean(),
  ]);
  const a = agg[0] ?? { n: 0, km: 0, eur: 0, toll: 0 };
  const fleet = ((settings?.data?.fleet as { id: string; name: string; v: { weight: number; height: number } }[] | undefined) ?? []);
  const defId = settings?.data?.defaultFleet as string | undefined;
  const trips: TripListItem[] = recent.map((t) => ({
    id: String(t._id), name: t.name, updatedAt: new Date(t.updatedAt).toISOString(), summary: t.summary, ...tripEnds(t.waypoints),
  }));
  const first = u.name.split(" ")[0];
  const stats = [
    { k: "Mentett fuvar", v: String(a.n) },
    { k: "Összes tervezett út", v: km(a.km) },
    { k: "Átlagos fuvarköltség", v: a.n ? eur(a.eur) : "–" },
    { k: "Útdíj összesen", v: a.n ? eur(a.toll) : "–" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Irányítópult</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Szia, {first}! 👋</h1>
        </div>
        <Link href="/planner" className="btn-primary !px-5 !py-3">+ Új útvonal tervezése</Link>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{s.k}</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{s.v}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Legutóbbi fuvarok</h2>
            {a.n > 6 && <Link href="/app/trips" className="text-sm font-medium text-violet-600 hover:text-violet-800">Mind ({a.n}) →</Link>}
          </div>
          {trips.length ? (
            <div className="grid gap-3 sm:grid-cols-2">{trips.map((t) => <TripCard key={t.id} t={t} />)}</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
              <div className="text-3xl">🛣️</div>
              <p className="mt-3 font-medium text-slate-800">Még nincs mentett fuvarod</p>
              <p className="mt-1 text-sm text-slate-500">Tervezz egy útvonalat, és mentsd el – itt mindig megtalálod.</p>
              <Link href="/planner" className="btn-primary mt-5">Útvonal tervezése</Link>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Járműveim</h2>
              <Link href="/planner" className="text-xs font-medium text-violet-600 hover:text-violet-800">Kezelés</Link>
            </div>
            {fleet.length ? (
              <ul className="space-y-2">
                {fleet.slice(0, 5).map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate font-medium text-slate-800">{f.name}{f.id === defId && <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">alap</span>}</span>
                    <span className="shrink-0 text-xs text-slate-500">{f.v.weight} t · {f.v.height} m</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Még nincs mentett járműved. A tervezőben a jármű-kártyán adhatsz hozzá flottát.</p>
            )}
          </section>

          <section className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-5 text-white shadow-lg shadow-violet-600/20">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">Tipp</div>
            <p className="mt-2 text-sm leading-relaxed text-violet-50">Az útvonal a térképen megfogható és húzható, a szünetek a valós kamionparkolókhoz illeszthetők – és a kész fuvart egy linkkel elküldheted a sofőrnek.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
