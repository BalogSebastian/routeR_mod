"use client";

import { useEffect, useMemo, useState } from "react";
import { DAY_EXT, hm, limits, parseHm, simulate, TWO_WEEK, WEEK_MAX, type DriverState, type Step } from "@/lib/drivetime";

const H = 3600_000;
const pad = (n: number) => String(n).padStart(2, "0");
const local = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const DAYS = ["vas", "hét", "kedd", "szer", "csüt", "pén", "szo"];
const when = (t: number, now: number) => {
  const d = new Date(t), n = new Date(now);
  const dd = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(n).setHours(0, 0, 0, 0)) / 86400_000);
  return `${dd === 0 ? "ma" : dd === 1 ? "holnap" : DAYS[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const STEP: Record<Step["kind"], { l: string; c: string }> = {
  drive: { l: "Vezetés", c: "bg-black" },
  break: { l: "Szünet", c: "bg-amber-400" },
  rest: { l: "Napi pihenő", c: "bg-[#00c97b]" },
  weekRest: { l: "Heti pihenő", c: "bg-sky-400" },
};

function TimeField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const bad = value.trim() !== "" && Number.isNaN(parseHm(value));
  return (
    <label className="block">
      <span className="label-xs">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" placeholder="óó:pp"
        className={`w-full border-b-2 bg-transparent py-2 text-[20px] font-bold tabular-nums outline-none ${bad ? "border-rose-500" : "border-black/15 focus:border-black"}`} />
      {hint && <span className="mt-0.5 block text-[11px] text-black/40">{hint}</span>}
    </label>
  );
}

function Gauge({ label, used, max, left, warn }: { label: string; used: number; max: number; left: number; warn?: boolean }) {
  const pct = Math.min(100, (used / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-black/50">{label}</span>
        <span className={`text-[15px] font-black tabular-nums ${warn ? "text-rose-600" : "text-black"}`}>még {hm(left)}</span>
      </div>
      <div className="mt-1.5 h-2.5 w-full bg-black/[0.07]">
        <div className={`h-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-400" : "bg-[#00c97b]"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-black/40"><span>{hm(used)} felhasználva</span><span>{hm(max)} keret</span></div>
    </div>
  );
}

export default function DrivingTool({ trips }: { trips: { id: string; label: string; min: number }[] }) {
  const [now, setNow] = useState<number | null>(null);
  const [today, setToday] = useState("0:00");
  const [since, setSince] = useState("0:00");
  const [dayStart, setDayStart] = useState("");
  const [week, setWeek] = useState("0");
  const [prev, setPrev] = useState("0");
  const [ext, setExt] = useState(0);
  const [red, setRed] = useState(0);
  const [dep, setDep] = useState("");
  const [drive, setDrive] = useState("");
  const [opts, setOpts] = useState({ useExt: true, useReduced: true, dual: false });

  useEffect(() => {
    const n = Date.now();
    // a böngésző órája csak a kliensen ismert: egyszeri kezdőérték
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(n); setDayStart(local(n - 2 * H).slice(11)); setDep(local(n));
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const state: DriverState | null = useMemo(() => {
    if (now === null) return null;
    const [hh, mm] = (dayStart || "06:00").split(":").map(Number);
    const ds = new Date(now); ds.setHours(hh || 0, mm || 0, 0, 0);
    if (ds.getTime() > now) ds.setDate(ds.getDate() - 1);
    const v = (s: string) => { const x = parseHm(s); return Number.isNaN(x) ? 0 : x; };
    return { dayDrive: v(today), sinceBreak: Math.min(v(since), v(today)), dayStart: ds.getTime(), weekDrive: Math.max(v(week), v(today)), prevWeek: v(prev), extUsed: ext, reducedUsed: red };
  }, [now, today, since, dayStart, week, prev, ext, red]);

  const lim = state && now !== null ? limits(state, now, opts.useReduced) : null;
  const sim = useMemo(() => {
    const d = parseHm(drive);
    if (!state || !dep || Number.isNaN(d) || d <= 0) return null;
    const start = new Date(dep).getTime();
    if (!Number.isFinite(start)) return null;
    return { start, ...simulate(start, d, state, opts) };
  }, [state, dep, drive, opts]);

  const bindText: Record<string, string> = { day: "a napi vezetési idő", week: "a heti 56 óra", twoWeek: "a kétheti 90 óra", span: "a napi pihenő kezdési határideje" };
  const chip = (on: boolean) => `border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition ${on ? "border-black bg-black text-[#00ff9d]" : "border-black/15 bg-white text-black/60 hover:border-black"}`;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* a sofőr mostani állapota */}
        <section className="border-2 border-black bg-white p-5 md:p-6">
          <h2 className="text-[15px] font-black uppercase tracking-tight">A sofőr most</h2>
          <p className="mt-1 text-[12.5px] text-black/50">A tachográf kijelzőjéről vagy a sofőrtől. Az időket óó:pp formában add meg.</p>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
            <TimeField label="Ma vezetett" value={today} onChange={setToday} hint="a napi pihenő óta" />
            <TimeField label="Utolsó szünet óta" value={since} onChange={setSince} hint="legalább 45 perces szünet" />
            <label className="block"><span className="label-xs">Napi pihenő vége</span>
              <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className="w-full border-b-2 border-black/15 bg-transparent py-2 text-[20px] font-bold outline-none focus:border-black" />
              <span className="mt-0.5 block text-[11px] text-black/40">a munkanap kezdete</span></label>
            <TimeField label="E héten vezetett" value={week} onChange={setWeek} hint="hétfő 00:00 óta, órában is jó (pl. 32)" />
            <TimeField label="Múlt héten vezetett" value={prev} onChange={setPrev} hint="a kétheti 90 órához" />
            <div>
              <span className="label-xs">10 órás napok a héten</span>
              <div className="mt-2 flex gap-1.5">{[0, 1, 2].map((n) => <button key={n} onClick={() => setExt(n)} className={chip(ext === n)}>{n}</button>)}</div>
              <span className="label-xs mt-4">Csökkentett pihenők (9 óra)</span>
              <div className="mt-2 flex gap-1.5">{[0, 1, 2, 3].map((n) => <button key={n} onClick={() => setRed(n)} className={chip(red === n)}>{n}</button>)}</div>
            </div>
          </div>
        </section>

        {/* eredmény */}
        <section className="relative overflow-hidden bg-[#050505] p-6 text-white md:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px]" />
          {lim && state && now !== null ? (
            <div className="relative">
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#00ff9d]">Ma még vezethet</div>
              <div className="mt-2 text-[clamp(3.2rem,8vw,5.5rem)] font-black leading-none tracking-tighter tabular-nums" style={{ fontFamily: "var(--font-brand)" }}>{hm(lim.todayLeft)}</div>
              <p className="mt-2 text-[13px] text-white/55">Ezt most {bindText[lim.binding]} korlátozza.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className={`border p-4 ${lim.blockLeft < 0.5 * H ? "border-amber-400 bg-amber-400/10" : "border-white/15"}`}>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Következő szünet</div>
                  <div className="mt-1 text-[22px] font-black tabular-nums">{lim.blockLeft <= 0 ? "MOST" : when(now + Math.min(lim.blockLeft, lim.todayLeft), now)}</div>
                  <div className="text-[12px] text-white/50">{lim.blockLeft <= 0 ? "4,5 óra letelt: 45 perc szünet kell" : `még ${hm(lim.blockLeft)} vezetés után, 45 perc`}</div>
                </div>
                <div className={`border p-4 ${lim.restBy - now < 2 * H ? "border-rose-500 bg-rose-500/10" : "border-white/15"}`}>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Napi pihenő legkésőbb</div>
                  <div className="mt-1 text-[22px] font-black tabular-nums">{lim.restBy <= now ? "MOST" : when(lim.restBy, now)}</div>
                  <div className="text-[12px] text-white/50">{opts.useReduced && state.reducedUsed < 3 ? "csökkentett (9 órás) pihenővel" : "11 órás pihenővel"}</div>
                </div>
              </div>
            </div>
          ) : <div className="h-48 animate-pulse bg-white/5" />}
        </section>
      </div>

      {lim && state && (
        <section className="grid gap-6 border-2 border-black bg-white p-5 md:grid-cols-3 md:p-6">
          <Gauge label="Napi" used={state.dayDrive} max={lim.dayMax} left={Math.max(0, lim.dayMax - state.dayDrive)} warn={lim.dayMax - state.dayDrive < H} />
          <Gauge label="Heti (56 óra)" used={state.weekDrive} max={WEEK_MAX} left={lim.weekLeft} warn={lim.weekLeft < 9 * H} />
          <Gauge label="Kétheti (90 óra)" used={state.prevWeek + state.weekDrive} max={TWO_WEEK} left={lim.twoWeekLeft} warn={lim.twoWeekLeft < 9 * H} />
        </section>
      )}

      {/* mikor ér oda? */}
      <section className="border-2 border-black bg-white shadow-[8px_8px_0_0_#00ff9d]">
        <div className="border-b-2 border-black p-5 md:p-6">
          <h2 className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-black uppercase leading-none tracking-tighter" style={{ fontFamily: "var(--font-brand)" }}>Mikor ér oda szabályosan?</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1fr_1.4fr]">
            <label className="block"><span className="label-xs">Indulás</span>
              <input type="datetime-local" value={dep} onChange={(e) => setDep(e.target.value)} className="w-full border-b-2 border-black/15 bg-transparent py-2 text-[17px] font-bold outline-none focus:border-black" /></label>
            <TimeField label="Hátralévő vezetési idő" value={drive} onChange={setDrive} hint="pl. 14:30" />
            <label className="block"><span className="label-xs">…vagy egy mentett fuvar</span>
              <select defaultValue="" onChange={(e) => { const t = trips.find((x) => x.id === e.target.value); if (t) setDrive(hm(t.min * 60_000)); }} className="w-full cursor-pointer border-b-2 border-black/15 bg-transparent py-2.5 text-[14px] font-semibold outline-none focus:border-black">
                <option value="">Válassz fuvart…</option>
                {trips.map((t) => <option key={t.id} value={t.id}>{t.label} · {hm(t.min * 60_000)} vezetés</option>)}
              </select></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setOpts((o) => ({ ...o, useExt: !o.useExt }))} className={chip(opts.useExt)}>10 órás napok</button>
            <button onClick={() => setOpts((o) => ({ ...o, useReduced: !o.useReduced }))} className={chip(opts.useReduced)}>Csökkentett pihenő</button>
            <button onClick={() => setOpts((o) => ({ ...o, dual: !o.dual }))} className={chip(opts.dual)}>👥 Két sofőr</button>
          </div>
        </div>
        {sim ? (
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-black/45">Érkezés</div>
                <div className="text-[clamp(2rem,4.5vw,3.2rem)] font-black leading-none tracking-tighter" style={{ fontFamily: "var(--font-brand)" }}>{when(sim.arrival, sim.start)}</div>
                <div className="mt-1 font-mono text-[12px] text-black/50">{new Date(sim.arrival).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              {[["Úton", hm(sim.arrival - sim.start)], ["Szünet", `${sim.breaks}×`], ["Pihenő", `${sim.rests}×`]].map(([a, b]) => (
                <div key={a}><div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-black/45">{a}</div><div className="text-[24px] font-black tabular-nums">{b}</div></div>
              ))}
            </div>
            {/* idővonal */}
            <div className="mt-6 flex h-9 w-full overflow-hidden border-2 border-black">
              {sim.steps.map((s, i) => (
                <div key={i} title={`${STEP[s.kind].l}: ${when(s.start, sim.start)} – ${when(s.end, sim.start)}`} className={`${STEP[s.kind].c} h-full origin-left border-r border-white/40 last:border-r-0 [animation:rr-bar_0.7s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ width: `${((s.end - s.start) / (sim.arrival - sim.start)) * 100}%`, animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-black/55">
              {(Object.keys(STEP) as Step["kind"][]).filter((k) => sim.steps.some((s) => s.kind === k)).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={`h-3 w-4 ${STEP[k].c}`} />{STEP[k].l}</span>)}
            </div>
            <ol className="mt-6 divide-y divide-black/10 border-y border-black/10">
              {sim.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-4 py-2.5 text-[13.5px]">
                  <span className={`h-3 w-3 shrink-0 ${STEP[s.kind].c}`} />
                  <span className="w-[150px] shrink-0 font-mono text-[12px] text-black/55">{when(s.start, sim.start)} – {new Date(s.end).toTimeString().slice(0, 5)}</span>
                  <span className="font-bold">{s.kind === "drive" ? `Vezetés ${hm(s.end - s.start)}` : s.note ?? STEP[s.kind].l}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[11.5px] leading-relaxed text-black/45">A számítás folyamatos vezetéssel, a megengedett legkorábbi megállásokkal számol (EU 561/2006). A forgalmat, a rakodást és a kamionstopot nem tartalmazza: ezekhez a tervező útvonal-menetrendje a pontos.</p>
          </div>
        ) : (
          <p className="p-6 text-[13.5px] text-black/50">Add meg a hátralévő vezetési időt, vagy válassz egy mentett fuvart, és megmutatjuk, mikor ér oda a szünetekkel és pihenőkkel együtt.</p>
        )}
      </section>
      <p className="text-[11.5px] text-black/40">A napi {hm(DAY_EXT)} vezetés hetente legfeljebb kétszer engedélyezett; a heti pihenő legalább 45 óra (csökkentve 24 óra).</p>
    </div>
  );
}
