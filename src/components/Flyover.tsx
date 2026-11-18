"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { COUNTRY_NAMES } from "@/lib/country-names";
import { eur, flag } from "@/lib/format";
import { cumulative, hoursAt, pointAtFraction } from "@/lib/schedule";
import type { LngLat, RouteResult } from "@/lib/types";

const KIND: Record<string, string> = { break: "☕ 45 perc szünet", rest: "🌙 Napi pihenő", wait: "⏳ Várakozás (tilalom)", ferry: "⛴ Komp / vasút" };
const SPEEDS = [1, 2, 4, 8];

const bearing = (a: LngLat, b: LngLat) => {
  const k = Math.cos((a[1] * Math.PI) / 180);
  return ((Math.atan2((b[0] - a[0]) * k, b[1] - a[1]) * 180) / Math.PI + 360) % 360;
};
const lerpAngle = (from: number, to: number, t: number) => from + ((((to - from) % 360) + 540) % 360 - 180) * t;

interface Hud { f: number; clock: string; km: number; left: number; cc: string; road: string; toll: number; stop: string | null; next: string; speedKmh: number }

/** Útvonal-lejátszás: a kamion végigmegy a tervezett úton – idő, km, ország, útdíj élőben, megállóknál megáll. */
export default function Flyover({ map, route, departure, onClose }: { map: MLMap; route: RouteResult; departure: string; onClose: () => void }) {
  const cum = useMemo(() => cumulative(route.geometry), [route]);
  const total = cum[cum.length - 1] || 1;
  const stops = useMemo(() => [...route.stops].filter((s) => (s.durH ?? 0) > 0).sort((a, b) => a.f - b.f), [route]);
  const secs = useMemo(() => route.sections ?? [], [route]);
  const dep = useMemo(() => new Date(departure).getTime() || 0, [departure]);
  const baseSec = Math.min(110, Math.max(28, route.roadKm / 11)); // 1×-os sebességnél a teljes út hossza (mp)

  const [hud, setHud] = useState<Hud | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const fRef = useRef(0);
  const playRef = useRef(true);
  const speedRef = useRef(2);
  const seekRef = useRef(false);

  useEffect(() => { playRef.current = playing; }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const saved = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
    for (const h of [map.dragPan, map.scrollZoom, map.doubleClickZoom, map.touchZoomRotate, map.boxZoom, map.keyboard]) h.disable();
    map.addSource("fly-trail", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } });
    map.addLayer({ id: "fly-trail-glow", type: "line", source: "fly-trail", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#a78bfa", "line-width": 16, "line-opacity": 0.35, "line-blur": 6 } });
    map.addLayer({ id: "fly-trail-line", type: "line", source: "fly-trail", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#7c3aed", "line-width": 6 } });

    const el = document.createElement("div");
    el.style.cssText = "width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:25px;box-shadow:0 0 0 6px rgba(124,58,237,.35),0 6px 18px rgba(0,0,0,.45);border:3px solid #7c3aed";
    el.textContent = "🚛";
    const marker = new maplibregl.Marker({ element: el, pitchAlignment: "viewport", rotationAlignment: "viewport" }).setLngLat(route.geometry[0]).addTo(map);

    let raf = 0, last = performance.now(), lastHud = 0, brg = bearing(route.geometry[0], route.geometry[Math.min(5, route.geometry.length - 1)]);
    let pause: { until: number; start: number; durH: number; label: string; i: number } | null = null;
    let nextStop = 0;
    const trailAt = (f: number): LngLat[] => {
      const t = f * total;
      let i = cum.findIndex((c) => c >= t);
      if (i < 0) i = cum.length - 1;
      return [...route.geometry.slice(0, i), pointAtFraction(route.geometry, cum, f)];
    };
    map.jumpTo({ center: route.geometry[0], zoom: 8.2, pitch: 58, bearing: brg });

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (seekRef.current) { seekRef.current = false; pause = null; nextStop = stops.findIndex((s) => s.f > fRef.current + 1e-6); if (nextStop < 0) nextStop = stops.length; }
      if (playRef.current) {
        if (pause) {
          if (now >= pause.until) { pause = null; nextStop++; }
        } else {
          fRef.current = Math.min(1, fRef.current + (dt * speedRef.current) / baseSec);
          const st = stops[nextStop];
          if (st && fRef.current >= st.f) {
            fRef.current = st.f;
            pause = { start: now, until: now + 2200 / Math.min(speedRef.current, 4), durH: st.durH ?? 0, label: `${KIND[st.kind] ?? st.kind}${st.place ? ` · ${st.place}` : ""}`, i: nextStop };
          }
          if (fRef.current >= 1) { playRef.current = false; setPlaying(false); }
        }
      }
      const f = fRef.current;
      const pos = pointAtFraction(route.geometry, cum, f);
      const ahead = pointAtFraction(route.geometry, cum, Math.min(1, f + 0.004));
      if (ahead[0] !== pos[0] || ahead[1] !== pos[1]) brg = lerpAngle(brg, bearing(pos, ahead), 0.06);
      marker.setLngLat(pos);
      map.jumpTo({ center: pos, bearing: brg });
      if (now - lastHud > 90 || !playRef.current) {
        lastHud = now;
        (map.getSource("fly-trail") as GeoJSONSource | undefined)?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: trailAt(f) } });
        const h = hoursAt(route, f);
        let waited = 0;
        for (const s of route.stops) if ((s.durH ?? 0) > 0 && s.atH < h - 1e-6) waited += s.durH ?? 0;
        if (pause) waited += (pause.durH * Math.min(1, (now - pause.start) / Math.max(1, pause.until - pause.start)));
        const wall = new Date(dep + (h + waited) * 3600e3);
        const cur = secs.find((s) => f >= s.f0 && f < s.f1) ?? secs[secs.length - 1];
        const toll = secs.reduce((a, s) => a + (f >= s.f1 ? s.tollEur : f > s.f0 ? s.tollEur * ((f - s.f0) / Math.max(1e-9, s.f1 - s.f0)) : 0), 0);
        const nx = stops.find((s) => s.f > f + 1e-6);
        setHud({
          f, km: f * route.roadKm, left: (1 - f) * route.roadKm, toll,
          clock: wall.toLocaleString("hu-HU", { weekday: "short", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
          cc: cur?.country ?? route.countries[0]?.country ?? "", road: cur?.label ?? "", speedKmh: pause ? 0 : Math.round(cur?.speed ?? 0),
          stop: pause?.label ?? null,
          next: nx ? `${KIND[nx.kind] ?? nx.kind} · ${nx.time.slice(11, 16)} · ${Math.round(nx.km)}. km` : "Célállomás",
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      marker.remove();
      for (const id of ["fly-trail-line", "fly-trail-glow"]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("fly-trail")) map.removeSource("fly-trail");
      for (const h of [map.dragPan, map.scrollZoom, map.doubleClickZoom, map.touchZoomRotate, map.boxZoom, map.keyboard]) h.enable();
      map.easeTo({ center: saved.center, zoom: Math.min(saved.zoom, 7), pitch: 0, bearing: 0, duration: 900 });
    };
  }, [map, route, cum, total, stops, secs, dep, baseSec]);

  const finished = hud ? hud.f >= 1 : false;
  const pct = Math.round((hud?.f ?? 0) * 100);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/15 bg-[#1b1040]/90 text-white shadow-2xl shadow-violet-950/50 backdrop-blur-xl">
        {hud?.stop && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 text-center text-[14px] font-extrabold text-amber-950">{hud.stop}</div>
        )}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">{finished ? "Megérkeztél" : "Útvonal-lejátszás"}</div>
              <div className="mt-0.5 text-[26px] font-extrabold leading-none tabular-nums sm:text-[30px]">{hud?.clock ?? "…"}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[26px] leading-none sm:text-[30px]">{hud ? flag(hud.cc) : ""}</div>
              <div className="mt-1 text-[12px] font-semibold text-violet-200">{hud ? COUNTRY_NAMES[hud.cc] ?? hud.cc : ""}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              ["Megtett", hud ? `${Math.round(hud.km)} km` : "–"],
              ["Hátra", hud ? `${Math.round(hud.left)} km` : "–"],
              ["Út", hud?.road || "–"],
              ["Útdíj eddig", hud ? eur(hud.toll) : "–"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/[0.08] px-1.5 py-2">
                <div className="truncate text-[15px] font-extrabold tabular-nums">{v}</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-300">{k}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <input
              type="range" min={0} max={1000} value={Math.round((hud?.f ?? 0) * 1000)}
              onChange={(e) => { fRef.current = +e.target.value / 1000; seekRef.current = true; }}
              className="h-2 w-full cursor-pointer accent-violet-400" aria-label="Pozíció az útvonalon"
            />
            <div className="mt-1 flex justify-between text-[11px] font-medium text-violet-300">
              <span>Következő: {hud?.next ?? "…"}</span><span>{pct}%</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => { if (finished) { fRef.current = 0; seekRef.current = true; } setPlaying((p) => (finished ? true : !p)); }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500 text-lg font-bold shadow-lg shadow-violet-900/40 transition hover:bg-violet-400 active:scale-95"
              aria-label={playing ? "Szünet" : "Lejátszás"}
            >{finished ? "↺" : playing ? "❚❚" : "▶"}</button>
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
