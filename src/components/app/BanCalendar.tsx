"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BANS, banText, cetNow, upcomingBans, type UpcomingBan } from "@/lib/bans";
import { dayName, hm, left, when, ymd } from "@/lib/bans-view";
import { COUNTRY_NAMES } from "@/lib/country-names";
import { flag } from "@/lib/format";

const DAY = 86400_000;
const WEIGHTS = [
  { w: 40, l: "12 t felett" },
  { w: 10, l: "7,5–12 t" },
  { w: 5, l: "3,5–7,5 t" },
];

export default function BanCalendar() {
  const [weight, setWeight] = useState(40);
  const [days, setDays] = useState(7);
  const [now, setNow] = useState<number | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    const run = () => setNow(cetNow());
    run();
    const id = window.setInterval(run, 30_000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    if (now === null) return null;
    const list = upcomingBans(now, days, weight, true);
    const day0 = Math.floor(now / DAY) * DAY;
    const span = days * DAY;
    const ccs = Object.keys(BANS).sort((a, b) => (COUNTRY_NAMES[a] ?? a).localeCompare(COUNTRY_NAMES[b] ?? b, "hu"));
    const byCc = new Map<string, UpcomingBan[]>(ccs.map((c) => [c, list.filter((b) => b.cc === c)]));
    return { list, day0, span, ccs, byCc, active: list.filter((b) => b.active) };
  }, [now, days, weight]);

  return (
    <div className="space-y-6">
      {/* vezérlők */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">Járműtömeg</span>
        {WEIGHTS.map((x) => (
          <button key={x.w} onClick={() => setWeight(x.w)} className={`border-2 px-3.5 py-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] transition ${weight === x.w ? "border-black bg-black text-[#00ff9d]" : "border-black/20 bg-white text-black hover:border-black"}`}>{x.l}</button>
        ))}
        <span className="ml-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">Időszak</span>
        {[7, 14].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`border-2 px-3.5 py-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] transition ${days === d ? "border-black bg-black text-[#00ff9d]" : "border-black/20 bg-white text-black hover:border-black"}`}>{d} nap</button>
        ))}
        {now !== null && <span className="ml-auto font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-black/45">most: {dayName(now)} {hm(now)} (CET)</span>}
      </div>

      {/* most érvényben */}
      <section className="relative overflow-hidden bg-[#050505] p-6 text-white md:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(135deg,#ff3b5c_0_2px,transparent_2px_22px)]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${data?.active.length ? "animate-pulse bg-rose-500" : "bg-[#00ff9d]"}`} />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-white/60">Most érvényben</span>
          </div>
          {!data ? <div className="mt-5 h-16 animate-pulse bg-white/5" /> : data.active.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.active.map((b) => (
                <div key={b.cc} className="border border-rose-500/40 bg-rose-500/[0.08] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[18px] font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-brand)" }}>{flag(b.cc)} {COUNTRY_NAMES[b.cc] ?? b.cc}</span>
                    <span className="font-mono text-[11px] font-bold text-rose-300">még {left(b.end - now!)}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-white/55">vége: {when(b.end, now!)}{b.holiday ? " · ünnepnap" : ""}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[22px] font-black uppercase tracking-tight text-[#00ff9d]" style={{ fontFamily: "var(--font-brand)" }}>Most sehol nincs kamionstop.</p>
          )}
        </div>
      </section>

      {/* idővonal */}
      <section className="overflow-x-auto border-2 border-black bg-white">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[150px_1fr] border-b-2 border-black">
            <div className="px-4 py-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-black/45">Ország</div>
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
              {data && Array.from({ length: days }, (_, i) => {
                const d = data.day0 + i * DAY;
                const dow = new Date(d).getUTCDay();
                return (
                  <div key={i} className={`border-l border-black/10 px-2 py-2.5 text-center ${dow === 0 || dow === 6 ? "bg-black/[0.04]" : ""}`}>
                    <div className={`text-[12px] font-black uppercase ${i === 0 ? "text-[#00a866]" : "text-black"}`}>{i === 0 ? "ma" : dayName(d)}</div>
                    <div className="font-mono text-[10px] text-black/45">{ymd(d)}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {data?.ccs.map((cc) => {
            const bans = data.byCc.get(cc) ?? [];
            const rule = BANS[cc];
            const off = weight <= rule.minWeight;
            return (
              <div key={cc} className={`group grid grid-cols-[150px_1fr] border-b border-black/10 last:border-b-0 ${hover === cc ? "bg-[#00ff9d]/[0.07]" : ""}`} onMouseEnter={() => setHover(cc)} onMouseLeave={() => setHover(null)}>
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className="text-[17px] leading-none">{flag(cc)}</span>
                  <span className={`truncate text-[13px] font-bold ${off ? "text-black/30" : "text-black"}`}>{COUNTRY_NAMES[cc] ?? cc}</span>
                </div>
                <div className="relative h-full min-h-[44px]">
                  {/* napok rácsa, hétvége */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
                    {Array.from({ length: days }, (_, i) => { const dow = new Date(data.day0 + i * DAY).getUTCDay(); return <div key={i} className={`border-l border-black/10 ${dow === 0 || dow === 6 ? "bg-black/[0.03]" : ""}`} />; })}
                  </div>
                  {off ? (
                    <span className="absolute inset-y-0 left-3 flex items-center font-mono text-[10.5px] text-black/35">csak {String(rule.minWeight).replace(".", ",")} t felett</span>
                  ) : bans.map((b) => {
                    const l = Math.max(0, (b.start - data.day0) / data.span) * 100;
                    const r = Math.min(1, (b.end - data.day0) / data.span) * 100;
                    if (r <= 0 || l >= 100) return null;
                    return (
                      <div key={`${b.start}`} title={`${COUNTRY_NAMES[cc] ?? cc}: ${when(b.start, now!)} → ${when(b.end, now!)}${b.holiday ? " (ünnepnap)" : ""}`}
                        className={`absolute top-1/2 h-[22px] -translate-y-1/2 overflow-hidden px-1.5 font-mono text-[10px] font-bold leading-[22px] whitespace-nowrap transition-transform duration-300 group-hover:scale-y-110 ${b.active ? "bg-rose-500 text-white" : b.holiday ? "bg-amber-400 text-black" : "bg-black text-[#00ff9d]"}`}
                        style={{ left: `${l}%`, width: `${Math.max(0.6, r - l)}%` }}>
                        {barLabel(b, r - l)}
                      </div>
                    );
                  })}
                  {/* most-vonal */}
                  <div aria-hidden className="absolute inset-y-0 w-[2px] bg-[#00c97b]" style={{ left: `${((now! - data.day0) / data.span) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="flex flex-wrap gap-4 font-mono text-[10.5px] font-bold uppercase tracking-[0.15em] text-black/55">
        <span className="flex items-center gap-2"><span className="h-3 w-5 bg-rose-500" /> most érvényben</span>
        <span className="flex items-center gap-2"><span className="h-3 w-5 bg-black" /> tilalom</span>
        <span className="flex items-center gap-2"><span className="h-3 w-5 bg-amber-400" /> ünnepnap</span>
        <span className="flex items-center gap-2"><span className="h-3 w-[2px] bg-[#00c97b]" /> most</span>
      </div>

      {/* országonkénti szabályok */}
      <section className="grid gap-4 md:grid-cols-2">
        {data?.ccs.map((cc) => {
          const next = data.list.find((b) => b.cc === cc);
          return (
            <div key={cc} className="border-2 border-black bg-white p-5 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#00ff9d]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-black uppercase tracking-tight text-black">{flag(cc)} {COUNTRY_NAMES[cc] ?? cc}</h3>
                {next && <span className={`px-2 py-0.5 font-mono text-[10.5px] font-bold ${next.active ? "bg-rose-500 text-white" : "bg-black/[0.06] text-black/65"}`}>{next.active ? `most · még ${left(next.end - now!)}` : `következő: ${when(next.start, now!)}`}</span>}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-black/60">{banText(cc)}.</p>
            </div>
          );
        })}
      </section>
      <p className="text-[12px] leading-relaxed text-black/45">
        Tájékoztató jellegű: a regionális és helyi tilalmak, valamint az évente külön kihirdetett napok (pl. francia „samedis rouges”) nincsenek benne. Indulás előtt érdemes ellenőrizni a hivatalos forrásokat. <Link href="/planner" className="font-semibold text-black underline">Fuvar tervezése a tilalmakkal →</Link>
      </p>
    </div>
  );
}

/** a sáv felirata a rendelkezésre álló szélesség szerint (többnapos tilalomnál napnévvel) */
function barLabel(b: UpcomingBan, widthPct: number): string {
  const multi = Math.floor(b.end / DAY) !== Math.floor(b.start / DAY) && b.end - b.start > 8 * 3600_000;
  if (multi && widthPct > 13) return `${dayName(b.start)} ${hm(b.start)} – ${dayName(b.end)} ${hm(b.end)}`;
  if (widthPct > 6) return `${hm(b.start)}–${hm(b.end)}`;
  return "";
}
