"use client";

import { useEffect, useRef, useState } from "react";
import type { CargoKind, Waypoint } from "@/lib/types";
import { placeIcon, PLACE_KINDS, type PlaceItem } from "@/lib/app-data";
import { loadPlaces, markUsed, matchPlaces, onPlacesChange, samePoint, savePlace } from "@/lib/client/places";
import { Ico } from "./ui";

interface Result { label: string; lat: number; lon: number }

interface Props {
  badge: string;
  badgeClass: string;
  placeholder: string;
  value: Waypoint | null;
  picking: boolean;
  onChange: (w: Waypoint | null) => void;
  onPickToggle: () => void;
  onRemove?: () => void;
  /** rakodás ezen a ponton (csak megállóknál) */
  cargo?: CargoKind;
  onCargo?: (k: CargoKind) => void;
}

const CARGO_OPTS: [CargoKind, string, string][] = [
  ["load", "⬆ Fel", "Felrakás"],
  ["unload", "⬇ Le", "Lerakás"],
  ["both", "⇅ Fel+le", "Felrakás és lerakás"],
  ["none", "– Nincs", "Nincs rakodás (pl. parkoló, telephely)"],
];

export default function WaypointInput({ badge, badgeClass, placeholder, value, picking, onChange, onPickToggle, onRemove, cargo, onCargo }: Props) {
  const [text, setText] = useState(value?.label ?? "");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Helyeim: a mentett címek elsőként jelennek meg a találatok között */
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); ctrl.current?.abort(); }, []);
  useEffect(() => {
    let alive = true;
    const load = () => void loadPlaces().then((p) => { if (alive) setPlaces(p); });
    load();
    const off = onPlacesChange(load);
    return () => { alive = false; off(); };
  }, []);

  const saved = value ? places.find((p) => samePoint(p, value)) : undefined;
  const placeHits = open ? matchPlaces(places, value ? "" : text, text.trim() ? 4 : 6) : [];

  const pickPlace = (p: PlaceItem) => {
    setText(p.name);
    setOpen(false);
    markUsed(p.id);
    onChange({ lat: p.lat, lon: p.lon, label: `${p.name} — ${p.label}` });
  };

  const saveCurrent = async () => {
    if (!value || saving) return;
    const name = window.prompt("Mentés a Helyeim közé. Név (pl. ügyfél vagy telephely neve):", value.label.split(/[—,]/)[0].trim())?.trim();
    if (!name) return;
    const kind = window.prompt(`Típus száma: ${PLACE_KINDS.map((k, i) => `${i + 1} = ${k.l}`).join(", ")}`, "2")?.trim();
    const k = PLACE_KINDS[Math.max(0, Math.min(PLACE_KINDS.length - 1, Number(kind) - 1 || 5))].k;
    setSaving(true);
    await savePlace({ name, kind: k, label: value.label, lat: value.lat, lon: value.lon });
    setSaving(false);
  };

  const search = (q: string) => {
    setText(q);
    if (value) onChange(null);
    if (timer.current) clearTimeout(timer.current);
    ctrl.current?.abort();
    if (q.trim().length < 2) { setResults([]); setOpen(places.length > 0); return; }
    timer.current = setTimeout(async () => {
      ctrl.current = new AbortController();
      setBusy(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: ctrl.current.signal });
        const j = await r.json();
        setResults(j.results ?? []);
        setOpen(true);
      } catch { /* megszakítva */ }
      finally { setBusy(false); }
    }, 350);
  };

  return (
    <div className="relative flex items-center gap-2">
      <span className={`relative z-[1] flex h-[28px] w-[28px] shrink-0 items-center justify-center text-xs font-black text-white ring-4 ring-white dark:ring-slate-900 ${badgeClass}`}>{badge}</span>
      <div className="relative min-w-0 flex-1">
        <input
          value={text}
          onChange={(e) => search(e.target.value)}
          onFocus={() => !value && (results.length > 0 || places.length > 0) && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={`field w-full pr-8 ${value ? "!border-black/60 !bg-[#00ff9d]/[0.08] dark:!bg-emerald-950/20" : ""}`}
        />
        {busy && <span className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-black" />}
        {saved && !busy && <span title={`Helyeim: ${saved.name}`} className="absolute right-2.5 top-2 text-[13px]">{placeIcon(saved.kind)}</span>}
        {value && !saved && !busy && (
          <button type="button" onClick={saveCurrent} title="Mentés a Helyeim közé" className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center text-[14px] text-black/30 transition hover:text-amber-500">{saving ? "…" : "☆"}</button>
        )}
        {open && (placeHits.length > 0 || results.length > 0) && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-none border-2 border-black bg-white text-sm shadow-[5px_5px_0_0_#00ff9d] dark:border-slate-700 dark:bg-slate-800">
            {placeHits.length > 0 && <li className="bg-black px-3 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#00ff9d]">Helyeim</li>}
            {placeHits.map((p) => (
              <li key={p.id}>
                <button type="button" className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#00ff9d] dark:hover:bg-slate-700" onMouseDown={(e) => { e.preventDefault(); pickPlace(p); }}>
                  <span className="text-[14px] leading-5">{placeIcon(p.kind)}</span>
                  <span className="min-w-0">
                    <span className="block font-bold">{p.name}</span>
                    <span className="block truncate text-[11px] text-black/50">{p.hours ? `${p.hours} · ` : ""}{p.label}</span>
                  </span>
                </button>
              </li>
            ))}
            {placeHits.length > 0 && results.length > 0 && <li className="bg-black/[0.05] px-3 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-black/45">Címkereső</li>}
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-[#00ff9d] dark:hover:bg-slate-700"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setText(r.label);
                    setOpen(false);
                    onChange({ lat: r.lat, lon: r.lon, label: r.label });
                  }}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {cargo && onCargo && (
        <select
          value={cargo}
          onChange={(e) => onCargo(e.target.value as CargoKind)}
          title={`Rakodás ezen a ponton: ${CARGO_OPTS.find((o) => o[0] === cargo)?.[2]} (a feltételes határátkelőkhöz)`}
          className="field h-[34px] w-[74px] shrink-0 !px-1.5 !py-0 !text-[11px]"
        >
          {CARGO_OPTS.map(([k, short, long]) => <option key={k} value={k} title={long}>{short}</option>)}
        </select>
      )}
      <button
        type="button"
        title="Pont kijelölése a térképen"
        onClick={onPickToggle}
        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-none border-2 transition ${picking ? "border-black bg-[#00ff9d] text-black" : "border-black/15 bg-white text-black/55 hover:border-black hover:text-black dark:border-slate-700 dark:bg-slate-800"}`}
      >
        <Ico name="crosshair" className="h-4 w-4" />
      </button>
      {onRemove && (
        <button type="button" title="Útpont törlése" onClick={onRemove} className="flex h-[34px] w-6 shrink-0 items-center justify-center text-black/35 hover:text-rose-600"><Ico name="x" className="h-4 w-4" /></button>
      )}
    </div>
  );
}
