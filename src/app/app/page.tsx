import Link from "next/link";
import TripCard, { tripEnds, type TripListItem } from "@/components/app/TripCard";
import { eur, km } from "@/lib/format";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export default async function Dashboard() {
  const u = (await getUser())!;
  const { Trip, Settings } = await getDb();
  const [recent, agg, settings, history] = await Promise.all([
    Trip.find({ userId: u._id }).sort({ updatedAt: -1 }).limit(6).select("name summary waypoints updatedAt").lean(),
    Trip.aggregate<{ n: number; km: number; eur: number; toll: number }>([
      { $match: { userId: u._id } },
      { $group: { _id: null, n: { $sum: 1 }, km: { $sum: "$summary.roadKm" }, eur: { $avg: "$summary.totalEur" }, toll: { $sum: "$summary.tollEur" } } },
    ]),
    Settings.findOne({ userId: u._id }).lean(),
    Trip.find({ userId: u._id }).sort({ createdAt: -1 }).limit(300).select("summary waypoints createdAt").lean(),
  ]);

  // havi bontás (utolsó 6 hónap) és leggyakoribb útvonalak
  const months: { key: string; label: string; eur: number; km: number; n: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("hu-HU", { month: "short" }), eur: 0, km: 0, n: 0 });
  }
  const routeCount = new Map<string, { label: string; n: number; eur: number }>();
  for (const t of history) {
    const d = new Date(t.createdAt);
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) { m.eur += t.summary?.totalEur ?? 0; m.km += t.summary?.roadKm ?? 0; m.n += 1; }
    const e = tripEnds(t.waypoints);
    const k = `${e.from}→${e.to}`;
    const r = routeCount.get(k) ?? { label: `${e.from} → ${e.to}`, n: 0, eur: 0 };
    r.n += 1; r.eur += t.summary?.totalEur ?? 0;
    routeCount.set(k, r);
  }
  const topRoutes = [...routeCount.values()].sort((a, b) => b.n - a.n || b.eur - a.eur).slice(0, 4);
  const maxEur = Math.max(1, ...months.map((m) => m.eur));
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

  const icons = [
    "M4 6h16M4 12h16M4 18h10",
    "M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM7 17c6 0 2-10 8-10",
    "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3",
    "M3 7h18M6 7v12h12V7M9 7V4h6v3",
  ];
  const tones = ["from-violet-500 to-indigo-500", "from-sky-500 to-blue-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500"];

  return (
    <div className="space-y-8">
      <section className="driver-hero relative overflow-hidden rounded-[28px] px-6 py-7 text-white shadow-xl shadow-violet-900/20 md:px-9 md:py-9">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-violet-200">Irányítópult</p>
            <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight md:text-[38px]">Szia, {first}! 👋</h1>
            <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-violet-100/90">
              {a.n ? `${a.n} mentett fuvarod van, összesen ${km(a.km)} tervezett úttal.` : "Tervezd meg az első kamionos útvonalad – útdíjjal, tilalmakkal, pihenőkkel."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
          {trips[0] && (
            <Link href={`/planner?trip=${trips[0].id}&driver=1`} className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3.5 text-[14.5px] font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]">
              🚚 Sofőr-nézet · legutóbbi fuvar
            </Link>
          )}
          <Link href="/planner" className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[14.5px] font-extrabold text-violet-700 shadow-lg shadow-violet-950/25 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]">
            <span className="text-lg leading-none">＋</span> Új útvonal tervezése
          </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.k} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-violet-900/[0.04]">
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${tones[i]}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={icons[i]} /></svg>
            </span>
            <div className="mt-4 text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-slate-900">{s.v}</div>
            <div className="mt-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">{s.k}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-violet-900/[0.04]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900">Havi fuvarköltség</h2>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">utolsó 6 hónap</span>
          </div>
          <div className="flex h-40 items-end gap-3">
            {months.map((m) => (
              <div key={m.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${m.n} fuvar · ${eur(m.eur)} · ${km(m.km)}`}>
                <span className="text-[11px] font-bold tabular-nums text-slate-500 opacity-0 transition group-hover:opacity-100">{m.eur ? eur(m.eur) : ""}</span>
                <div className="w-full rounded-xl bg-gradient-to-t from-violet-600 to-violet-400 transition group-hover:from-violet-700" style={{ height: `${Math.max(m.eur ? 8 : 3, (m.eur / maxEur) * 100)}%`, opacity: m.eur ? 1 : 0.2 }} />
                <span className="text-[11.5px] font-semibold capitalize text-slate-500">{m.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-violet-900/[0.04]">
          <h2 className="mb-4 text-[16px] font-extrabold tracking-tight text-slate-900">Leggyakoribb útvonalak</h2>
          {topRoutes.length ? (
            <ol className="space-y-2.5">
              {topRoutes.map((r, i) => (
                <li key={r.label} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-extrabold text-violet-700">{i + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-800">{r.label}</span><span className="text-xs text-slate-500">{r.n}× · átlag {eur(r.eur / r.n)}</span></span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-slate-500">Itt jelennek meg a leggyakrabban tervezett útvonalaid.</p>}
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-extrabold tracking-tight text-slate-900">Legutóbbi fuvarok</h2>
            {a.n > 6 && <Link href="/app/trips" className="rounded-full bg-violet-50 px-3.5 py-1.5 text-[13px] font-bold text-violet-700 transition hover:bg-violet-100">Mind ({a.n}) →</Link>}
          </div>
          {trips.length ? (
            <div className="grid gap-4 sm:grid-cols-2">{trips.map((t) => <TripCard key={t.id} t={t} />)}</div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-white/70 p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-3xl">🛣️</div>
              <p className="mt-4 text-[16px] font-extrabold text-slate-900">Még nincs mentett fuvarod</p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">Tervezz egy útvonalat, és mentsd el – itt mindig megtalálod.</p>
              <Link href="/planner" className="btn-primary mt-6 !rounded-2xl !px-6 !py-3">Útvonal tervezése</Link>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-violet-900/[0.04]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900">Járműveim</h2>
              <Link href="/planner" className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-100">Kezelés</Link>
            </div>
            {fleet.length ? (
              <ul className="space-y-2">
                {fleet.slice(0, 5).map((f) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">🚛</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-slate-800">{f.name}{f.id === defId && <span className="ml-1.5 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-extrabold text-violet-700">alap</span>}</span>
                      <span className="block text-xs text-slate-500">{f.v.weight} t · {f.v.height} m</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-slate-500">Még nincs mentett járműved. A tervezőben a jármű-kártyán adhatsz hozzá flottát.</p>
            )}
          </section>

          <section className="driver-hero relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-violet-900/20">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-violet-100">💡 Tipp</div>
              <p className="mt-3 text-[14px] font-medium leading-relaxed text-violet-50">Az útvonal a térképen megfogható és húzható, a szünetek a valós kamionparkolókhoz illeszthetők – és a kész fuvart egy linkkel elküldheted a sofőrnek.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
