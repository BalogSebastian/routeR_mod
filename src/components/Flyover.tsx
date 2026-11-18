"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { COUNTRY_NAMES } from "@/lib/country-names";
import { countryRuns, makeHoursAt, type FlyData } from "@/lib/flydata";
import { eur, flag } from "@/lib/format";
import { cumulative, pointAtFraction } from "@/lib/schedule";
import type { LngLat } from "@/lib/types";

const KIND: Record<string, { icon: string; label: string }> = {
  break: { icon: "☕", label: "45 perc szünet" },
  rest: { icon: "🌙", label: "Napi pihenő" },
  wait: { icon: "⏳", label: "Várakozás (tilalom)" },
  ferry: { icon: "⛴", label: "Komp / vasút" },
};
const SPEEDS = [1, 2, 4, 8];
const ZOOM: Record<string, number> = { motorway: 8.7, trunk: 9.3, primary: 9.7, secondary: 10.3, minor: 10.9, local: 11.5, ferry: 8.4 };
const SHIELD: Record<string, string> = { motorway: "#1d4ed8", trunk: "#0f766e", primary: "#d97706", secondary: "#7c3aed" };

const bearing = (a: LngLat, b: LngLat) => {
  const k = Math.cos((a[1] * Math.PI) / 180);
  return ((Math.atan2((b[0] - a[0]) * k, b[1] - a[1]) * 180) / Math.PI + 360) % 360;
};
const lerpAngle = (from: number, to: number, t: number) => from + ((((to - from) % 360) + 540) % 360 - 180) * t;
const hue = (cc: string) => ((cc.charCodeAt(0) * 37 + cc.charCodeAt(1) * 91) % 360);
/** éjszakai sötétítés mértéke (0..0,6) az óra szerint */
const nightOf = (h: number) => (h >= 21 || h < 5 ? 0.58 : h >= 19 ? 0.58 * ((h - 19) / 2) : h < 6.5 ? 0.58 * (1 - (h - 5) / 1.5) : 0);
const hm = (ms: number) => new Date(ms).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
const durTxt = (h: number) => (h >= 1 ? `${Math.floor(h)} ó ${String(Math.round((h % 1) * 60)).padStart(2, "0")} p` : `${Math.max(1, Math.round(h * 60))} perc`);

interface StopHud { icon: string; label: string; place: string; durH: number; from: number; to: number; p: number }
interface Hud {
  f: number; wall: number; day: number; km: number; left: number; v: number; road: string; cls: string; cc: string; toll: number;
  stop: StopHud | null; next: string; night: number; hour: number;
}

/**
 * Útvonal-lejátszás (a tervezőben és a sofőr-oldalon is): a kamion végigmegy az úton,
 * élő műszerfallal – idő, nap, ország, út, sebesség, útdíj –, megállóknál megáll, éjjel besötétedik.
 */
export default function Flyover({ map, data, onClose }: { map: MLMap; data: FlyData; onClose: () => void }) {
  const geo = data.geometry;
  const cum = useMemo(() => cumulative(geo), [geo]);
  const total = cum[cum.length - 1] || 1;
  const hoursAt = useMemo(() => makeHoursAt(data), [data]);
  const stops = useMemo(() => [...data.stops].sort((a, b) => a[0] - b[0]), [data]);
  const secs = data.sections;
  const runs = useMemo(() => countryRuns(data), [data]);
  const dep = useMemo(() => new Date(data.dep).getTime() || 0, [data.dep]);
  const arrMs = useMemo(() => new Date(data.arr).getTime() || 0, [data.arr]);
  const tollTotal = useMemo(() => secs.reduce((a, s) => a + s[6], 0), [secs]);
  const baseSec = Math.min(120, Math.max(30, data.km / 10));

  const [hud, setHud] = useState<Hud | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [toast, setToast] = useState<{ cc: string; id: number } | null>(null);
  const fRef = useRef(0);
  const playRef = useRef(true);
  const speedRef = useRef(2);
  const seekRef = useRef(false);
  const endedRef = useRef(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => { playRef.current = playing; }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const saved = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
    for (const h of [map.dragPan, map.scrollZoom, map.doubleClickZoom, map.touchZoomRotate, map.boxZoom, map.keyboard]) h.disable();
    const line = (coordinates: LngLat[]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates } });
    map.addSource("fly-base", { type: "geojson", data: line(geo) });
    map.addSource("fly-trail", { type: "geojson", data: line([]) });
    const lay = { "line-cap": "round" as const, "line-join": "round" as const };
    map.addLayer({ id: "fly-base-case", type: "line", source: "fly-base", layout: lay, paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.85 } });
    map.addLayer({ id: "fly-base-line", type: "line", source: "fly-base", layout: lay, paint: { "line-color": "#a78bfa", "line-width": 5, "line-opacity": 0.55 } });
    map.addLayer({ id: "fly-trail-glow", type: "line", source: "fly-trail", layout: lay, paint: { "line-color": "#7c3aed", "line-width": 18, "line-opacity": 0.35, "line-blur": 7 } });
    map.addLayer({ id: "fly-trail-case", type: "line", source: "fly-trail", layout: lay, paint: { "line-color": "#ffffff", "line-width": 10 } });
    map.addLayer({ id: "fly-trail-line", type: "line", source: "fly-trail", layout: lay, paint: { "line-color": "#6d28d9", "line-width": 6.5 } });

    const el = document.createElement("div");
    el.style.cssText = "width:52px;height:52px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;border:3px solid #6d28d9;box-shadow:0 8px 22px rgba(0,0,0,.5)";
    el.textContent = "🚛";
    el.animate([{ boxShadow: "0 0 0 0 rgba(124,58,237,.55), 0 8px 22px rgba(0,0,0,.5)" }, { boxShadow: "0 0 0 22px rgba(124,58,237,0), 0 8px 22px rgba(0,0,0,.5)" }], { duration: 1600, iterations: Infinity });
    const marker = new maplibregl.Marker({ element: el, pitchAlignment: "viewport", rotationAlignment: "viewport" }).setLngLat(geo[0]).addTo(map);

    const bb = geo.reduce((b, p) => b.extend(p as [number, number]), new maplibregl.LngLatBounds(geo[0] as [number, number], geo[0] as [number, number]));
    const pad = { top: 90, bottom: 330, left: 50, right: 50 };
    let brg = bearing(geo[0], geo[Math.min(8, geo.length - 1)]);
    let zoom = 9;
    map.fitBounds(bb, { padding: pad, duration: 0, pitch: 0, bearing: 0 });
    let introUntil = performance.now() + 2800;
    const introTimer = setTimeout(() => map.easeTo({ center: geo[0], zoom: 9, pitch: 58, bearing: brg, duration: 1900 }), 700);

    let raf = 0, last = performance.now(), lastHud = 0, lastCc = secs[0]?.[1] ?? "", pause: { start: number; until: number; i: number } | null = null, nextStop = 0, toastId = 0;
    const toastTimers: ReturnType<typeof setTimeout>[] = [];
    const trailAt = (f: number): LngLat[] => {
      const t = f * total;
      let i = cum.findIndex((c) => c >= t);
      if (i < 0) i = cum.length - 1;
      return [...geo.slice(0, i), pointAtFraction(geo, cum, f)];
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (seekRef.current) {
        seekRef.current = false; pause = null;
        if (endedRef.current && fRef.current < 1) { endedRef.current = false; setEnded(false); introUntil = 0; }
        nextStop = stops.findIndex((s) => s[0] > fRef.current + 1e-6);
        if (nextStop < 0) nextStop = stops.length;
        lastCc = (secs.find((s) => fRef.current >= s[2] && fRef.current < s[3]) ?? secs[0])?.[1] ?? lastCc;
      }
      const intro = now < introUntil;
      if (playRef.current && !intro && !endedRef.current) {
        if (pause) {
          if (now >= pause.until) { pause = null; nextStop++; }
        } else {
          fRef.current = Math.min(1, fRef.current + (dt * speedRef.current) / baseSec);
          const st = stops[nextStop];
          if (st && fRef.current >= st[0]) {
            fRef.current = st[0];
            pause = { start: now, until: now + 2800 / Math.min(speedRef.current, 4), i: nextStop };
          }
          if (fRef.current >= 1) {
            endedRef.current = true; setEnded(true); setPlaying(false); playRef.current = false;
            map.fitBounds(bb, { padding: pad, duration: 2200, pitch: 0, bearing: 0 });
          }
        }
      }
      const f = fRef.current;
      const pos = pointAtFraction(geo, cum, f);
      marker.setLngLat(pos);
      const cur = secs.find((s) => f >= s[2] && f < s[3]) ?? secs[secs.length - 1];
      if (!intro && !endedRef.current) {
        const ahead = pointAtFraction(geo, cum, Math.min(1, f + 0.012));
        if (ahead[0] !== pos[0] || ahead[1] !== pos[1]) brg = lerpAngle(brg, bearing(pos, ahead), 0.045);
        zoom += ((ZOOM[cur?.[7] ?? "primary"] ?? 9.7) - zoom) * 0.025;
        map.jumpTo({ center: pos, bearing: brg, zoom, pitch: 58 });
      }
      if (cur && cur[1] !== lastCc) {
        lastCc = cur[1];
        const id = ++toastId;
        setToast({ cc: cur[1], id });
        toastTimers.push(setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3600));
      }
      if (now - lastHud > 80 || !playRef.current) {
        lastHud = now;
        (map.getSource("fly-trail") as GeoJSONSource | undefined)?.setData(line(trailAt(f)));
        const h = hoursAt(f);
        let waited = 0;
        for (const s of stops) if (s[3] < h - 1e-6) waited += s[2];
        let stopHud: StopHud | null = null;
        if (pause) {
          const s = stops[pause.i];
          const p = Math.min(1, (now - pause.start) / Math.max(1, pause.until - pause.start));
          const fromMs = dep + (h + waited) * 3600e3;
          waited += s[2] * p;
          stopHud = { icon: KIND[s[1]]?.icon ?? "•", label: KIND[s[1]]?.label ?? s[1], place: s[6], durH: s[2], from: fromMs, to: fromMs + s[2] * 3600e3, p };
        }
        const wall = dep + (h + waited) * 3600e3;
        const wd = new Date(wall), dd = new Date(dep);
        const day = Math.round((new Date(wd.getFullYear(), wd.getMonth(), wd.getDate()).getTime() - new Date(dd.getFullYear(), dd.getMonth(), dd.getDate()).getTime()) / 864e5) + 1;
        const toll = secs.reduce((a, s) => a + (f >= s[3] ? s[6] : f > s[2] ? s[6] * ((f - s[2]) / Math.max(1e-9, s[3] - s[2])) : 0), 0);
        const nx = stops.find((s) => s[0] > f + 1e-6);
        const hourFrac = wd.getHours() + wd.getMinutes() / 60;
        setHud({
          f, wall, day, km: f * data.km, left: (1 - f) * data.km, v: pause || endedRef.current ? 0 : cur?.[5] ?? 0,
          road: cur?.[0] ?? "", cls: cur?.[7] ?? "", cc: cur?.[1] ?? "", toll, stop: stopHud, night: nightOf(hourFrac), hour: hourFrac,
          next: nx ? `${KIND[nx[1]]?.icon ?? ""} ${KIND[nx[1]]?.label ?? nx[1]} · ${durTxt(Math.max(0.02, nx[3] - h))} múlva · ${Math.round((nx[0] - f) * data.km)} km` : "🏁 Célállomás",
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(introTimer);
      toastTimers.forEach(clearTimeout);
      marker.remove();
      for (const id of ["fly-trail-line", "fly-trail-case", "fly-trail-glow", "fly-base-line", "fly-base-case"]) if (map.getLayer(id)) map.removeLayer(id);
      for (const id of ["fly-trail", "fly-base"]) if (map.getSource(id)) map.removeSource(id);
      for (const h of [map.dragPan, map.scrollZoom, map.doubleClickZoom, map.touchZoomRotate, map.boxZoom, map.keyboard]) h.enable();
      map.easeTo({ center: saved.center, zoom: Math.min(saved.zoom, 7), pitch: 0, bearing: 0, duration: 900 });
    };
  }, [map, data, geo, cum, total, hoursAt, stops, secs, dep, baseSec]);

  const replay = () => { fRef.current = 0; endedRef.current = false; seekRef.current = true; setEnded(false); setPlaying(true); playRef.current = true; };
  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    fRef.current = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    seekRef.current = true;
  };
  const f = hud?.f ?? 0;
  const wallDate = hud ? new Date(hud.wall) : null;
  const night = hud?.night ?? 0;
  const totalWall = arrMs && dep ? (arrMs - dep) / 3600e3 : data.driveMin / 60;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* éjszakai hangulat */}
      <div className="absolute inset-0 transition-opacity duration-700" style={{ background: "#0a1040", mixBlendMode: "multiply", opacity: night }} />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />

      {/* felső sor: út-tábla + sebesség */}
      <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-3 sm:left-5 sm:right-5 sm:top-5">
        <div className="flex items-center gap-3 rounded-2xl bg-[#1b1040]/85 px-3.5 py-2.5 text-white shadow-xl backdrop-blur-md">
          {hud?.road ? (
            <span className="flex h-9 min-w-[44px] items-center justify-center rounded-lg px-2 text-[15px] font-extrabold" style={{ background: SHIELD[hud.cls] ?? "#475569", color: hud.cls === "primary" ? "#111" : "#fff", border: "2px solid rgba(255,255,255,.85)" }}>{hud.road}</span>
          ) : <span className="text-2xl">🛣️</span>}
          <div className="leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">Aktuális út</div>
            <div className="text-[13px] font-bold">{hud?.cls === "motorway" ? "Autópálya" : hud?.cls === "trunk" ? "Autóút" : hud?.cls === "primary" ? "Főút" : hud?.cls === "ferry" ? "Komp / vasút" : "Mellékút"}</div>
          </div>
        </div>
        <div className="relative flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#1b1040]/85 shadow-xl backdrop-blur-md">
          <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="#a78bfa" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${Math.min(1, (hud?.v ?? 0) / 100) * 213.6} 213.6`} className="transition-[stroke-dasharray] duration-500" />
          </svg>
          <div className="text-center text-white"><div className="text-[22px] font-extrabold leading-none tabular-nums">{Math.round(hud?.v ?? 0)}</div><div className="text-[9px] font-bold uppercase tracking-wider text-violet-300">km/h</div></div>
        </div>
      </div>

      {/* országváltás */}
      {toast && (
        <div key={toast.id} className="absolute left-1/2 top-24 -translate-x-1/2 animate-[toast_3.6s_ease_both] rounded-3xl bg-white/95 px-6 py-3 text-center shadow-2xl shadow-violet-950/40 backdrop-blur">
          <div className="text-[34px] leading-none">{flag(toast.cc)}</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Határátlépés</div>
          <div className="text-[18px] font-extrabold text-slate-900">{COUNTRY_NAMES[toast.cc] ?? toast.cc}</div>
        </div>
      )}

      {/* megálló */}
      {hud?.stop && (
        <div className="absolute left-1/2 top-[34%] w-[min(92%,380px)] -translate-x-1/2 animate-[pop_.35s_ease_both] rounded-3xl bg-gradient-to-br from-amber-300 to-orange-500 p-5 text-center text-amber-950 shadow-2xl shadow-orange-900/40">
          <div className="text-[44px] leading-none">{hud.stop.icon}</div>
          <div className="mt-2 text-[22px] font-extrabold leading-tight">{hud.stop.label}</div>
          {hud.stop.place && <div className="mt-0.5 text-[13px] font-semibold opacity-80">{hud.stop.place}</div>}
          <div className="mt-2 text-[15px] font-bold tabular-nums">{hm(hud.stop.from)} → {hm(hud.stop.to)} · {durTxt(hud.stop.durH)}</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/15"><div className="h-full rounded-full bg-amber-950/70" style={{ width: `${hud.stop.p * 100}%` }} /></div>
        </div>
      )}

      {/* érkezés */}
      {ended && (
        <div className="pointer-events-auto absolute left-1/2 top-[18%] w-[min(94%,440px)] -translate-x-1/2 animate-[pop_.5s_ease_both] rounded-[28px] bg-white p-6 text-center shadow-2xl shadow-violet-950/50">
          <div className="text-5xl">🏁</div>
          <div className="mt-2 text-[24px] font-extrabold tracking-tight text-slate-900">Megérkeztél!</div>
          <div className="text-[13px] font-medium text-slate-500">{data.title}</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[["Távolság", `${data.km} km`], ["Vezetés", durTxt(data.driveMin / 60)], ["Teljes idő", durTxt(totalWall)], ["Napok", `${data.days}`], ["Pihenők", `${stops.length}`], ["Útdíj", eur(tollTotal)]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-violet-50 px-2 py-2.5"><div className="text-[15px] font-extrabold tabular-nums text-violet-800">{v}</div><div className="text-[10px] font-bold uppercase tracking-wider text-violet-500">{k}</div></div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={replay} className="rounded-2xl bg-violet-600 px-5 py-3 text-[14px] font-extrabold text-white transition hover:bg-violet-700 active:scale-95">↺ Újra</button>
            <button onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 text-[14px] font-bold text-slate-700 transition hover:bg-slate-200">✕ Bezárás</button>
          </div>
        </div>
      )}

      {/* alsó műszerfal */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center p-2.5 sm:p-4">
        <div className="pointer-events-auto w-full max-w-[720px] overflow-hidden rounded-[26px] border border-white/15 bg-[#1b1040]/92 p-4 text-white shadow-2xl shadow-violet-950/60 backdrop-blur-xl sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
                <span>{(hud?.hour ?? 12) >= 6 && (hud?.hour ?? 12) < 20 ? "☀️" : "🌙"}</span>
                {data.days > 1 ? `${hud?.day ?? 1}. nap · ` : ""}{wallDate ? wallDate.toLocaleDateString("hu-HU", { weekday: "long", month: "short", day: "numeric" }) : ""}
              </div>
              <div className="mt-0.5 text-[40px] font-extrabold leading-none tabular-nums sm:text-[46px]">{wallDate ? hm(hud!.wall) : "--:--"}</div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-[30px] leading-none">{hud ? flag(hud.cc) : ""}</div>
              <div className="mt-1 truncate text-[12px] font-bold text-violet-200">{hud ? COUNTRY_NAMES[hud.cc] ?? hud.cc : ""}</div>
              <div className="truncate text-[11px] font-medium text-violet-300/80">{data.title}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[["Megtett", hud ? `${Math.round(hud.km)} km` : "–"], ["Hátra", hud ? `${Math.round(hud.left)} km` : "–"], ["Haladás", `${Math.round(f * 100)}%`], ["Útdíj eddig", hud ? eur(hud.toll) : "–"]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/[0.08] px-1.5 py-2">
                <div className="truncate text-[15px] font-extrabold tabular-nums">{v}</div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-violet-300">{k}</div>
              </div>
            ))}
          </div>

          {/* idővonal: országok + megállók */}
          <div className="mt-4">
            <div className="relative h-7 cursor-pointer touch-none select-none overflow-hidden rounded-full bg-white/10" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seek(e); }} onPointerMove={(e) => { if (e.buttons) seek(e); }}>
              {runs.map(([cc, f0, f1], i) => (
                <div key={i} className="absolute inset-y-0 flex items-center justify-center overflow-hidden text-[13px]" style={{ left: `${f0 * 100}%`, width: `${(f1 - f0) * 100}%`, background: `hsl(${hue(cc)} 55% 42% / .75)`, borderRight: "1px solid rgba(255,255,255,.35)" }}>
                  {(f1 - f0) > 0.07 ? flag(cc) : ""}
                </div>
              ))}
              <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${f * 100}%` }} />
              {stops.map((s, i) => (
                <span key={i} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px] drop-shadow" style={{ left: `${s[0] * 100}%` }}>{KIND[s[1]]?.icon}</span>
              ))}
              <div className="absolute inset-y-[-2px] w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,.9)]" style={{ left: `${f * 100}%` }} />
            </div>
            <div className="mt-1.5 truncate text-[11.5px] font-semibold text-violet-200">Következő: {hud?.next ?? "…"}</div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => { if (ended) { replay(); return; } setPlaying((p) => !p); }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500 text-lg font-bold shadow-lg shadow-violet-900/40 transition hover:bg-violet-400 active:scale-95"
              aria-label={playing ? "Szünet" : "Lejátszás"}
            >{ended ? "↺" : playing ? "❚❚" : "▶"}</button>
            <div className="flex gap-1">
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => setSpeed(s)} className={`rounded-xl px-3 py-2 text-[13px] font-extrabold transition ${speed === s ? "bg-white text-violet-700" : "bg-white/10 text-violet-100 hover:bg-white/20"}`}>{s}×</button>
              ))}
            </div>
            <button onClick={onClose} className="ml-auto rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-bold text-violet-100 transition hover:bg-white/20">✕ Bezárás</button>
          </div>
        </div>
      </div>
    </div>
  );
}
