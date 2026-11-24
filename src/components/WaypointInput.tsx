"use client";

import { useEffect, useRef, useState } from "react";
import type { CargoKind, Waypoint } from "@/lib/types";
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

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); ctrl.current?.abort(); }, []);

  const search = (q: string) => {
    setText(q);
    if (value) onChange(null);
    if (timer.current) clearTimeout(timer.current);
    ctrl.current?.abort();
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
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
          onFocus={() => results.length && !value && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={`field w-full pr-8 ${value ? "!border-black/60 !bg-[#00ff9d]/[0.08] dark:!bg-emerald-950/20" : ""}`}
        />
        {busy && <span className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-black" />}
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-none border-2 border-black bg-white text-sm shadow-[5px_5px_0_0_#00ff9d] dark:border-slate-700 dark:bg-slate-800">
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
