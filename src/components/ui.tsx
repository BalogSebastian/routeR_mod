"use client";

import type { ReactNode } from "react";

const ICONS: Record<string, string> = {
  route: "M6 19a3 3 0 100-6 3 3 0 000 6zm12-8a3 3 0 100-6 3 3 0 000 6zM9 16h6a3 3 0 003-3V8M6 13V9a3 3 0 013-3h2",
  truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  euro: "M17 6.5A6 6 0 1017 17.5M4 10h9M4 14h9",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  ban: "M5.6 5.6l12.8 12.8M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  parking: "M9 17V7h4a3 3 0 010 6H9M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  coin: "M12 6v12M9 9.5c0-1 1.2-1.5 3-1.5s3 .7 3 1.8c0 2.3-6 1.2-6 3.7 0 1.2 1.3 1.9 3 1.9s3-.6 3-1.6M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  road: "M8 3L5 21M16 3l3 18M12 4v3M12 10v4M12 17v3",
  swap: "M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3",
  plus: "M12 5v14M5 12h14",
  pin: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  chevron: "M6 9l6 6 6-6",
  x: "M6 6l12 12M18 6L6 18",
  ferry: "M3 17c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0 3-1.3 4.5 0M5 14l-1-4h16l-1 4M8 10V6h8v4M12 3v3",
  crosshair: "M12 3v4M12 17v4M3 12h4M17 12h4M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

export function Ico({ name, className = "h-4 w-4" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Card({ icon, title, hint, children, right }: { icon: keyof typeof ICONS; title: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card">
      <header className="mb-4 flex items-start gap-3 border-b-2 border-dashed border-black/10 pb-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-black text-[#00ff9d]">
          <Ico name={icon} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="rr-num font-mono text-[10px] font-bold text-black/30" />
            <h2 className="text-[14px] font-black uppercase leading-tight tracking-tight text-black">{title}</h2>
          </div>
          {hint && <p className="mt-0.5 text-[11.5px] leading-snug text-black/50 dark:text-slate-400">{hint}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Toggle({ checked, onChange, label, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; icon: keyof typeof ICONS }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`group flex items-center gap-2 rounded-none border-2 px-2.5 py-2 text-left text-[12.5px] font-semibold transition ${
        checked
          ? "border-black bg-black text-white"
          : "border-black/15 bg-white text-black/65 hover:border-black dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
      }`}
    >
      <Ico name={icon} className={`h-4 w-4 shrink-0 ${checked ? "text-[#00ff9d]" : "text-black/35"}`} />
      <span className="min-w-0 flex-1 leading-tight">{label}</span>
      <span className={`relative h-4 w-7 shrink-0 transition ${checked ? "bg-[#00ff9d]" : "bg-black/15 dark:bg-slate-600"}`}>
        <span className={`absolute top-0.5 h-3 w-3 shadow transition-all ${checked ? "left-[14px] bg-black" : "left-0.5 bg-white"}`} />
      </span>
    </button>
  );
}

export function Num({ label, unit, value, onChange, step }: { label: string; unit?: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; step: number }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-black/45 dark:text-slate-400">{label}</span>
      <span className="relative block">
        <input type="number" inputMode="decimal" className="field w-full pr-8 tabular-nums" value={Number.isFinite(value) ? value : ""} step={step} min={0} onChange={onChange} />
        {unit && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10.5px] font-bold text-black/35">{unit}</span>}
      </span>
    </label>
  );
}
