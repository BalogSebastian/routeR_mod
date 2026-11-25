import Link from "next/link";
import TripCard, { tripEnds, type TripListItem } from "@/components/app/TripCard";
import RouteNet from "@/components/app/RouteNet";
import { eur, km } from "@/lib/format";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { TOOLS } from "@/lib/nav";

export default async function Dashboard() {
  const u = (await getUser())!;
  const { Trip, Settings } = await getDb();
  const [recent, agg, settings, history] = await Promise.all([
    Trip.find({ userId: u._id }).sort({ favorite: -1, updatedAt: -1 }).limit(6).select("name summary waypoints favorite updatedAt").lean(),
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
    id: String(t._id), name: t.name, updatedAt: new Date(t.updatedAt).toISOString(), summary: t.summary, favorite: !!t.favorite, ...tripEnds(t.waypoints),
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
  const card = "border-2 border-black bg-white transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#00ff9d]";
  const kicker = "font-mono text-[10.5px] font-bold uppercase tracking-[0.25em] text-black/45";
  const head = "text-[15px] font-black uppercase tracking-tight text-black";

  return (
    <div className="space-y-8">
      {/* fejléc: fekete panel élő útvonalhálózattal */}
      <section className="rr-up relative overflow-hidden bg-[#050505] px-6 py-9 text-white md:px-10 md:py-12">
        <RouteNet id="dash" truck dim={0.85} />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-[2px] w-10 bg-[#00ff9d]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-[#00ff9d]">Irányítópult</span>
            </div>
            <h1 className="mt-5 font-black uppercase leading-[0.9] tracking-tighter" style={{ fontFamily: "var(--font-brand)" }}>
              <span className="block overflow-hidden pt-[0.08em] text-[clamp(2.6rem,6vw,4.8rem)]">
                <span className="rr-rise" style={{ animationDelay: "0.1s" }}>Szia,</span>
              </span>
              <span className="block overflow-hidden pt-[0.08em] text-[clamp(2.6rem,6vw,4.8rem)] text-transparent [-webkit-text-stroke:1.5px_white]">
                <span className="rr-rise" style={{ animationDelay: "0.22s" }}>{first}!</span>
              </span>
            </h1>
            <p className="rr-up mt-5 max-w-md text-[15px] leading-relaxed text-white/65" style={{ animationDelay: "0.35s" }}>
              {a.n ? `${a.n} mentett fuvarod van, összesen ${km(a.km)} tervezett úttal.` : "Tervezd meg az első kamionos útvonalad – útdíjjal, tilalmakkal, pihenőkkel."}
            </p>
          </div>
          <div className="rr-up flex w-full flex-col gap-4 sm:w-auto sm:flex-row" style={{ animationDelay: "0.45s" }}>
            {trips[0] && (
              <Link href={`/planner?trip=${trips[0].id}&driver=1`} className="inline-flex items-center justify-center gap-2 border-2 border-white/40 px-6 py-4 text-[12.5px] font-extrabold uppercase tracking-[0.16em] text-white transition hover:border-white hover:bg-white hover:text-black">
                🚚 Sofőr-nézet · legutóbbi
              </Link>
            )}
            <Link href="/planner" className="inline-flex items-center justify-center gap-2 bg-[#00ff9d] px-7 py-4 text-[12.5px] font-extrabold uppercase tracking-[0.16em] text-black shadow-[6px_6px_0_0_#fff] transition-all duration-300 hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none">
              <span className="text-lg leading-none">＋</span> Új útvonal tervezése
            </Link>
          </div>
        </div>
      </section>

      {/* számok */}
      <section className="grid grid-cols-2 border-2 border-black bg-white lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.k} className={`rr-up group relative overflow-hidden p-5 md:p-6 ${i % 2 === 0 ? "border-r-2 border-black" : ""} ${i < 2 ? "border-b-2 border-black lg:border-b-0" : ""} lg:border-r-2 lg:last:border-r-0`} style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
            <span aria-hidden className="absolute inset-0 origin-bottom scale-y-0 bg-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100" />
            <div className="relative flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-black/30 transition-colors group-hover:text-[#00ff9d]">0{i + 1}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-black transition-colors group-hover:text-[#00ff9d]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={icons[i]} /></svg>
            </div>
            <div className="relative mt-5 text-[clamp(1.7rem,3vw,2.5rem)] font-black leading-none tracking-tighter tabular-nums text-black transition-colors group-hover:text-white" style={{ fontFamily: "var(--font-brand)" }}>{s.v}</div>
            <div className="relative mt-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-black/50 transition-colors group-hover:text-white/60">{s.k}</div>
          </div>
        ))}
      </section>

      {/* eszközök */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="h-[2px] w-10 bg-black" />
          <span className={kicker}>Eszközök a napi munkához</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {TOOLS.map((t, i) => (
            <Link key={t.href} href={t.href} className="rr-up group relative overflow-hidden border-2 border-black bg-white p-4 transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#00ff9d]" style={{ animationDelay: `${0.15 + i * 0.05}s` }}>
              <span aria-hidden className="absolute inset-0 origin-bottom scale-y-0 bg-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100" />
              <span className="relative flex h-10 w-10 items-center justify-center bg-[#00ff9d] text-black transition group-hover:shadow-[3px_3px_0_0_#fff]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
              </span>
              <span className="relative mt-4 block text-[14px] font-black uppercase tracking-tight text-black transition group-hover:text-white">{t.label}</span>
              <span className="relative mt-1 block text-[12px] leading-snug text-black/50 transition group-hover:text-white/60">{t.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
        <section className={`${card} p-5 md:p-6`}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className={head}>Havi fuvarköltség</h2>
            <span className={kicker}>utolsó 6 hónap</span>
          </div>
          <div className="flex h-44 items-end gap-3">
            {months.map((m, i) => (
              <div key={m.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${m.n} fuvar · ${eur(m.eur)} · ${km(m.km)}`}>
                <span className="font-mono text-[11px] font-bold tabular-nums text-black/60 opacity-0 transition group-hover:opacity-100">{m.eur ? eur(m.eur) : ""}</span>
                <div className="w-full origin-bottom bg-black transition-colors duration-300 group-hover:bg-[#00ff9d] [animation:rr-grow_0.9s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ height: `${Math.max(m.eur ? 8 : 3, (m.eur / maxEur) * 100)}%`, opacity: m.eur ? 1 : 0.12, animationDelay: `${0.3 + i * 0.07}s` }} />
                <span className="font-mono text-[11px] font-bold uppercase text-black/45">{m.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className={`${card} p-5 md:p-6`}>
          <h2 className={`${head} mb-5`}>Leggyakoribb útvonalak</h2>
          {topRoutes.length ? (
            <ol className="divide-y divide-black/10 border-y border-black/10">
              {topRoutes.map((r, i) => (
                <li key={r.label} className="flex items-center gap-3 py-3 text-sm">
                  <span className="font-mono text-[13px] font-black text-black/25">0{i + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold text-black">{r.label}</span><span className="font-mono text-[11px] text-black/45">{r.n}× · átlag {eur(r.eur / r.n)}</span></span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm leading-relaxed text-black/50">Itt jelennek meg a leggyakrabban tervezett útvonalaid.</p>}
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-[clamp(1.4rem,2.6vw,2rem)] font-black uppercase leading-none tracking-tighter text-black" style={{ fontFamily: "var(--font-brand)" }}>Kedvencek és legutóbbi fuvarok</h2>
            {a.n > 6 && <Link href="/app/trips" className="shrink-0 border-b-[3px] border-[#00ff9d] font-mono text-[12px] font-bold uppercase tracking-[0.15em] text-black transition hover:bg-[#00ff9d]">Mind ({a.n}) →</Link>}
          </div>
          {trips.length ? (
            <div className="grid gap-5 sm:grid-cols-2">{trips.map((t) => <TripCard key={t.id} t={t} />)}</div>
          ) : (
            <div className="relative overflow-hidden border-2 border-dashed border-black/30 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#00ff9d] text-3xl shadow-[5px_5px_0_0_#000]">🛣️</div>
              <p className="mt-6 text-[20px] font-black uppercase tracking-tight text-black" style={{ fontFamily: "var(--font-brand)" }}>Még nincs mentett fuvarod</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-black/55">Tervezz egy útvonalat, és mentsd el – itt mindig megtalálod.</p>
              <Link href="/planner" className="btn-primary mt-7">Útvonal tervezése</Link>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className={`${card} p-5 md:p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className={head}>Járműveim</h2>
              <Link href="/app/vehicles" className="border-b-2 border-[#00ff9d] font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-black transition hover:bg-[#00ff9d]">Kezelés</Link>
            </div>
            {fleet.length ? (
              <ul className="divide-y divide-black/10 border-y border-black/10">
                {fleet.slice(0, 5).map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-black text-lg">🚛</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-black">{f.name}{f.id === defId && <span className="ml-1.5 bg-[#00ff9d] px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold uppercase text-black">alap</span>}</span>
                      <span className="block font-mono text-[11px] text-black/45">{f.v.weight} t · {f.v.height} m</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-black/55">Még nincs mentett járműved. A Járműveim oldalon adhatsz hozzá.</p>
            )}
          </section>

          <section className="relative overflow-hidden bg-[#00ff9d] p-6 text-black">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-15 [background-image:repeating-linear-gradient(90deg,black_0_2px,transparent_2px_60px)] [animation:rr-stripes_3s_linear_infinite]" />
            <div className="relative">
              <div className="font-mono text-[11px] font-black uppercase tracking-[0.25em]">💡 Tipp</div>
              <p className="mt-3 text-[15px] font-semibold leading-relaxed">Az útvonal a térképen megfogható és húzható, a szünetek a valós kamionparkolókhoz illeszthetők – és a kész fuvart egy linkkel elküldheted a sofőrnek.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
