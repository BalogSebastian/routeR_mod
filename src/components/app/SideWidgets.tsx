"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cetNow, upcomingBans } from "@/lib/bans";
import { groupBans, left, when, type BanGroup } from "@/lib/bans-view";
import { COUNTRY_NAMES } from "@/lib/country-names";
import { eur, flag } from "@/lib/format";
import type { SidebarData } from "@/lib/app-data";
import type { Waypoint } from "@/lib/types";

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/30";

/* ---------- élő menü-adatok (e havi számok, jóváhagyásra várók) ---------- */

export function useSidebarData(): SidebarData | null {
  const path = usePathname();
  const [data, setData] = useState<SidebarData | null>(null);
  const load = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    const r = await fetch("/api/app/sidebar", { cache: "no-store" }).catch(() => null);
    if (r?.ok) setData((await r.json().catch(() => null)) as SidebarData | null);
  }, []);
  // oldalváltáskor (pl. mentés vagy jóváhagyás után) és percenként frissül
  useEffect(() => {
    let alive = true;
    fetch("/api/app/sidebar", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: SidebarData | null) => { if (alive && j) setData(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [path]);
  useEffect(() => {
    const id = window.setInterval(load, 60_000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    window.addEventListener("routeR:refresh", load);
    return () => { clearInterval(id); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", load); window.removeEventListener("routeR:refresh", load); };
  }, [load]);
  return data;
}

/** felpörgő szám (a mozgáscsökkentést kérő felhasználóknál azonnal a végérték) */
export function CountUp({ value, format = (n) => new Intl.NumberFormat("hu-HU").format(Math.round(n)), ms = 1100 }: { value: number; format?: (n: number) => string; ms?: number }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || start === value) { from.current = value; setV(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 4);
      setV(start + (value - start) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <span className="tabular-nums">{format(v)}</span>;
}

/* ---------- Ez a hónap ---------- */

export function MonthPanel({ data }: { data: SidebarData | null }) {
  const m = data?.month ?? { n: 0, km: 0, toll: 0, eur: 0 };
  const p = data?.prev ?? { n: 0, km: 0, toll: 0, eur: 0 };
  const monthName = new Intl.DateTimeFormat("hu-HU", { month: "long", timeZone: "Europe/Budapest" }).format(new Date());
  // a sáv: e havi útdíj a múlt hónap azonos időszakához képest
  const max = Math.max(m.toll, p.toll, 1);
  const delta = p.toll > 0 ? Math.round(((m.toll - p.toll) / p.toll) * 100) : null;
  const cells = [
    { k: "fuvar", v: m.n, f: undefined },
    { k: "km", v: m.km, f: (n: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(n) },
  ];
  return (
    <section className="relative border border-white/12 bg-white/[0.035] p-3.5">
      <div className="flex items-center justify-between">
        <span className={label}>Ez a hónap</span>
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/35">{monthName}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {cells.map((c) => (
          <div key={c.k}>
            <div className="text-[22px] font-black leading-none tracking-tight text-white" style={{ fontFamily: "var(--font-brand)" }}>{data ? <CountUp value={c.v} format={c.f} /> : "–"}</div>
            <div className="mt-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/40">{c.k}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2 border-t border-white/10 pt-3">
        <div>
          <div className="text-[20px] font-black leading-none tracking-tight text-[#00ff9d]" style={{ fontFamily: "var(--font-brand)" }}>{data ? <CountUp value={m.toll} format={(n) => eur(n)} /> : "–"}</div>
          <div className="mt-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/40">útdíj</div>
        </div>
        {delta !== null && (
          <span title="a múlt hónap azonos időszakához képest" className={`mb-0.5 px-1.5 py-0.5 font-mono text-[10.5px] font-black ${delta > 0 ? "bg-[#00ff9d]/15 text-[#00ff9d]" : delta < 0 ? "bg-white/10 text-white/70" : "bg-white/10 text-white/50"}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {/* összevetés: e hónap és a múlt hónap azonos időszaka */}
      <div className="mt-2.5 space-y-1" aria-hidden>
        {[{ v: m.toll, c: "bg-[#00ff9d]" }, { v: p.toll, c: "bg-white/25" }].map((b, i) => (
          <div key={i} className="h-[3px] w-full bg-white/[0.06]">
            <div className={`h-full ${b.c} transition-[width] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]`} style={{ width: data ? `${Math.max(b.v ? 3 : 0, (b.v / max) * 100)}%` : "0%" }} />
          </div>
        ))}
        <div className="flex justify-between pt-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-white/30"><span>e hónap</span><span>múlt hó, eddig</span></div>
      </div>
    </section>
  );
}

/* ---------- Kamionstop-figyelő ---------- */

export function useBans(days = 7, weight = 40): { now: number; groups: BanGroup[] } | null {
  const [st, setSt] = useState<{ now: number; groups: BanGroup[] } | null>(null);
  useEffect(() => {
    const run = () => { const now = cetNow(); setSt({ now, groups: groupBans(upcomingBans(now, days, weight)) }); };
    run();
    const id = window.setInterval(run, 60_000);
    return () => clearInterval(id);
  }, [days, weight]);
  return st;
}

export function Flags({ ccs, max = 6 }: { ccs: string[]; max?: number }) {
  return (
    <span className="flex flex-wrap gap-1">
      {ccs.slice(0, max).map((c) => (
        <span key={c} title={COUNTRY_NAMES[c] ?? c} className="inline-flex items-center gap-1 bg-white/[0.07] px-1.5 py-[1px] font-mono text-[10px] font-bold text-white/85">
          <span className="text-[11px] leading-none">{flag(c)}</span>{c}
        </span>
      ))}
      {ccs.length > max && <span className="px-1 font-mono text-[10px] text-white/45">+{ccs.length - max}</span>}
    </span>
  );
}

export function BanWatch() {
  const st = useBans(7);
  const groups = st?.groups.slice(0, 4) ?? [];
  return (
    <Link href="/app/bans" className="group relative block border border-white/12 bg-white/[0.035] p-3.5 transition hover:border-[#00ff9d]/60">
      <div className="flex items-center justify-between">
        <span className={`${label} transition group-hover:text-[#00ff9d]`}>Kamionstop</span>
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.15em] text-white/35">7,5 t felett</span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {!st && <li className="h-12 animate-pulse bg-white/[0.04]" />}
        {st && groups.length === 0 && <li className="text-[12px] text-white/50">A következő 7 napban nincs tilalom.</li>}
        {st && groups.map((g) => (
          <li key={`${g.start}-${g.end}`} className="relative pl-3">
            <span aria-hidden className={`absolute left-0 top-[3px] h-[calc(100%-6px)] w-[2px] ${g.active ? "bg-rose-500" : g.holiday ? "bg-amber-400" : "bg-[#00ff9d]/60"}`} />
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-[12px] font-extrabold uppercase tracking-[0.04em] ${g.active ? "text-rose-400" : "text-white"}`}>
                {g.active ? <><span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500 align-middle" />Most</> : when(g.start, st.now)}
              </span>
              <span className="truncate font-mono text-[10px] text-white/40">{g.active ? `még ${left(g.end - st.now)}` : `→ ${when(g.end, st.now)}`}</span>
            </div>
            <div className="mt-1"><Flags ccs={g.ccs} max={5} /></div>
            {g.holiday && <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.15em] text-amber-300/80">ünnepnap</div>}
          </li>
        ))}
      </ul>
      <span className="mt-3 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 transition group-hover:text-[#00ff9d]">Teljes naptár →</span>
    </Link>
  );
}

/* ---------- Gyors fuvar ---------- */

interface Hit { label: string; lat: number; lon: number; cc?: string }

function useGeocode(q: string, enabled: boolean) {
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!enabled || q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const j = (await r.json()) as { results?: Hit[] };
        setHits((j.results ?? []).slice(0, 5));
      } catch { /* megszakítva */ }
      setBusy(false);
    }, 280);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, enabled]);
  return { hits: enabled && q.trim().length >= 2 ? hits : [], busy };
}

const short = (l: string) => l.split(/[—,]/)[0].trim();

function PlaceInput({ badge, placeholder, value, onPick, autoFocus }: { badge: string; placeholder: string; value: Hit | null; onPick: (h: Hit | null) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState(value ? short(value.label) : "");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const { hits, busy } = useGeocode(q, open && (!value || short(value.label) !== q));
  const pick = (h: Hit) => { onPick(h); setQ(short(h.label)); setOpen(false); };
  return (
    <div className="relative">
      <div className={`flex items-center gap-2 border bg-black/40 px-2.5 transition ${open ? "border-[#00ff9d]" : "border-white/15"}`}>
        <span className="font-mono text-[10px] font-black text-[#00ff9d]">{badge}</span>
        <input
          value={q}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); if (value) onPick(null); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => Math.min(hits.length - 1, i + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
            if (e.key === "Enter" && hits[hi]) { e.preventDefault(); pick(hits[hi]); }
            if (e.key === "Escape") setOpen(false);
          }}
          className="min-w-0 flex-1 bg-transparent py-2 text-[13px] font-semibold text-white outline-none placeholder:font-normal placeholder:text-white/30"
        />
        {busy && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-[#00ff9d]" />}
        {value && !busy && <span className="text-[11px] text-[#00ff9d]">✓</span>}
      </div>
      {open && hits.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-auto border border-white/15 bg-[#0c0c0c] shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
          {hits.map((h, i) => (
            <li key={`${h.lat},${h.lon},${i}`}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(h)} onMouseEnter={() => setHi(i)}
                className={`block w-full px-2.5 py-2 text-left text-[12px] leading-snug ${i === hi ? "bg-[#00ff9d] text-black" : "text-white/80"}`}>
                <span className="font-bold">{short(h.label)}</span>
                <span className={`block truncate text-[10.5px] ${i === hi ? "text-black/60" : "text-white/40"}`}>{h.label.split("—")[1]?.trim() ?? h.cc}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** a tervezőbe a már meglévő megosztási formátummal (#s=…) visz át: ott azonnal számol */
export function plannerUrl(w: Waypoint[]): string {
  return `/planner#s=${btoa(encodeURIComponent(JSON.stringify({ w })))}`;
}

export function QuickTrip({ onGo }: { onGo?: () => void }) {
  const [a, setA] = useState<Hit | null>(null);
  const [b, setB] = useState<Hit | null>(null);
  /** cserénél a mezők újraindulnak a felcserélt értékkel */
  const [swap, setSwap] = useState(0);
  const ready = !!a && !!b;
  const go = () => {
    if (!a || !b) return;
    onGo?.();
    window.location.href = plannerUrl([{ lat: a.lat, lon: a.lon, label: a.label }, { lat: b.lat, lon: b.lon, label: b.label }]);
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className="border border-white/12 bg-white/[0.035] p-3.5">
      <div className="flex items-center justify-between">
        <span className={label}>Gyors fuvar</span>
        <button type="button" title="Csere" onClick={() => { setA(b); setB(a); setSwap((n) => n + 1); }} className="font-mono text-[12px] text-white/35 transition hover:text-[#00ff9d]">⇅</button>
      </div>
      <div className="mt-3 space-y-1.5">
        <PlaceInput key={`a${swap}`} badge="A" placeholder="Honnan?" value={a} onPick={setA} />
        <PlaceInput key={`b${swap}`} badge="B" placeholder="Hová?" value={b} onPick={setB} />
      </div>
      <button disabled={!ready} className={`mt-2.5 flex w-full items-center justify-center gap-2 py-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.18em] transition ${ready ? "bg-[#00ff9d] text-black shadow-[3px_3px_0_0_#fff] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none" : "cursor-not-allowed bg-white/[0.06] text-white/30"}`}>
        Tervezés <span className="font-mono">→</span>
      </button>
    </form>
  );
}
