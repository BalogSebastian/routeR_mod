"use client";

import { useEffect, useState } from "react";

export interface GeoHit { label: string; lat: number; lon: number; cc?: string }

/** címkereső (Photon/OSM a saját /api/geocode végponton át), világos stílusban */
export default function GeoSearch({ value, onPick, placeholder = "Cím, város, cég…", autoFocus }: { value: GeoHit | null; onPick: (h: GeoHit | null) => void; placeholder?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [hi, setHi] = useState(0);
  const active = open && q.trim().length >= 2 && q !== value?.label;
  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const j = (await r.json()) as { results?: GeoHit[] };
        setHits(j.results ?? []); setHi(0);
      } catch { /* megszakítva */ }
      setBusy(false);
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, active]);
  const shown = active ? hits : [];
  const pick = (h: GeoHit) => { onPick(h); setQ(h.label); setOpen(false); };
  return (
    <div className="relative">
      <div className={`flex items-center gap-2 border-b-2 transition ${open ? "border-black" : "border-black/15"}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-black/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input value={q} autoFocus={autoFocus} placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); setOpen(true); if (value) onPick(null); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => Math.min(shown.length - 1, i + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
            if (e.key === "Enter" && shown[hi]) { e.preventDefault(); pick(shown[hi]); }
          }}
          className="min-w-0 flex-1 bg-transparent py-3 text-[16px] font-medium text-black outline-none placeholder:font-normal placeholder:text-black/25" />
        {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/15 border-t-black" />}
        {value && !busy && <span className="font-mono text-[11px] font-bold text-[#00a866]">✓</span>}
      </div>
      {shown.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto border-2 border-black bg-white shadow-[5px_5px_0_0_#00ff9d]">
          {shown.map((h, i) => (
            <li key={`${h.lat},${h.lon},${i}`}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(h)} onMouseEnter={() => setHi(i)}
                className={`block w-full px-3 py-2 text-left text-[13px] ${i === hi ? "bg-[#00ff9d]" : ""}`}>{h.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
