"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FleetItem } from "@/components/Planner";
import { VEHICLE_PRESETS } from "@/lib/presets";
import type { EuroClass, Vehicle } from "@/lib/types";
import { km } from "@/lib/format";
import TruckSide from "./TruckSide";

const EURO: { v: EuroClass; l: string }[] = [{ v: "euro6", l: "EURO 6" }, { v: "euro5", l: "EURO 5" }, { v: "euro4", l: "EURO 4" }, { v: "older", l: "EURO 3 vagy régebbi" }];
const euroLabel = (e: EuroClass) => EURO.find((x) => x.v === e)?.l.replace(" vagy régebbi", "-") ?? e;

/** a mezők és az elfogadott tartományok */
const FIELDS: { k: keyof Vehicle; l: string; unit: string; min: number; max: number; step: number }[] = [
  { k: "weight", l: "Össztömeg", unit: "t", min: 1, max: 60, step: 0.5 },
  { k: "axleLoad", l: "Tengelyterhelés", unit: "t", min: 1, max: 13, step: 0.5 },
  { k: "height", l: "Magasság", unit: "m", min: 1.5, max: 4.6, step: 0.05 },
  { k: "width", l: "Szélesség", unit: "m", min: 1.5, max: 3.2, step: 0.05 },
  { k: "length", l: "Hossz", unit: "m", min: 3, max: 25.25, step: 0.25 },
  { k: "axles", l: "Tengelyek", unit: "db", min: 2, max: 9, step: 1 },
  { k: "consumption", l: "Fogyasztás", unit: "l/100", min: 5, max: 60, step: 0.5 },
];

const hu = (n: number) => n.toLocaleString("hu-HU", { maximumFractionDigits: 2 });
const uid = () => `f${Math.random().toString(36).slice(2, 9)}`;

async function saveFleet(fleet: FleetItem[], defaultFleet: string | undefined): Promise<boolean> {
  // a többi beállítás (költségek, No-Go, átkelők…) érintetlen marad
  const cur = await fetch("/api/settings", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null) as { data?: Record<string, unknown> } | null;
  if (!cur) return false;
  const data = { ...(cur.data ?? {}), fleet, defaultFleet };
  if (!defaultFleet) delete (data as Record<string, unknown>).defaultFleet;
  const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).catch(() => null);
  return !!r?.ok;
}

export default function VehiclesManager({ initialFleet, initialDefault, usage }: { initialFleet: FleetItem[]; initialDefault?: string; usage: Record<string, { n: number; km: number; last?: string }> }) {
  const [fleet, setFleet] = useState(initialFleet);
  const [def, setDef] = useState(initialDefault);
  const [edit, setEdit] = useState<FleetItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");

  const commit = async (next: FleetItem[], nextDef: string | undefined) => {
    const prev = { fleet, def };
    setFleet(next); setDef(nextDef); setState("saving");
    const ok = await saveFleet(next, nextDef);
    if (ok) { setState("saved"); setTimeout(() => setState(""), 1800); }
    else { setFleet(prev.fleet); setDef(prev.def); setState("error"); }
  };

  const openNew = () => { setIsNew(true); setEdit({ id: uid(), name: "", v: { ...VEHICLE_PRESETS[0].v } }); };
  const save = async (item: FleetItem) => {
    const exists = fleet.some((f) => f.id === item.id);
    const next = exists ? fleet.map((f) => (f.id === item.id ? item : f)) : [...fleet, item];
    setEdit(null);
    await commit(next, def ?? item.id);
  };
  const remove = async (f: FleetItem) => {
    if (!window.confirm(`Törlöd a(z) „${f.name}” járművet a flottából? A mentett fuvarokat ez nem érinti.`)) return;
    const next = fleet.filter((x) => x.id !== f.id);
    await commit(next, def === f.id ? next[0]?.id : def);
  };
  const duplicate = async (f: FleetItem) => commit([...fleet, { id: uid(), name: `${f.name} (másolat)`, v: { ...f.v } }], def);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-black/45">{fleet.length} jármű</span>
        <span aria-live="polite" className={`font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] ${state === "error" ? "text-rose-600" : "text-black/45"}`}>
          {state === "saving" ? "Mentés…" : state === "saved" ? "✓ Mentve" : state === "error" ? "A mentés nem sikerült – próbáld újra." : ""}
        </span>
        <button onClick={openNew} className="btn-primary ml-auto">+ Új jármű</button>
      </div>

      {fleet.length ? (
        <div className="rr-stack grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {fleet.map((f) => {
            const u = usage[f.id];
            const isDef = f.id === def;
            return (
              <article key={f.id} className={`group relative flex flex-col border-2 border-black bg-white transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 ${isDef ? "shadow-[6px_6px_0_0_#00ff9d]" : "hover:shadow-[6px_6px_0_0_#000]"}`}>
                <div className="relative overflow-hidden bg-[#050505] px-4 pb-1 pt-4 text-white">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:22px_22px]" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[17px] font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-brand)" }}>{f.name}</h3>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[10px] font-bold uppercase">
                        <span className="bg-white/10 px-1.5 py-0.5">{euroLabel(f.v.euro)}</span>
                        <span className="bg-white/10 px-1.5 py-0.5">{f.v.axles} tengely</span>
                        {f.v.hazmat && <span className="bg-[#ff8a00] px-1.5 py-0.5 text-black">ADR</span>}
                      </div>
                    </div>
                    <button onClick={() => !isDef && commit(fleet, f.id)} title={isDef ? "Indításkor ez töltődik be" : "Legyen alapértelmezett"}
                      className={`shrink-0 px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] transition ${isDef ? "bg-[#00ff9d] text-black" : "border border-white/25 text-white/60 hover:border-[#00ff9d] hover:text-[#00ff9d]"}`}>
                      {isDef ? "★ Alap" : "☆ Alap"}
                    </button>
                  </div>
                  <TruckSide v={f.v} className="relative mt-1 w-full text-white transition-transform duration-500 group-hover:translate-x-1" />
                </div>
                <dl className="grid grid-cols-3 border-b-2 border-black text-center">
                  {[["Össztömeg", `${hu(f.v.weight)} t`], ["Szélesség", `${hu(f.v.width)} m`], ["Tengelyterh.", `${hu(f.v.axleLoad)} t`]].map(([k, v], i) => (
                    <div key={k} className={`px-2 py-3 ${i < 2 ? "border-r-2 border-black" : ""}`}>
                      <dd className="text-[17px] font-black tabular-nums text-black" style={{ fontFamily: "var(--font-brand)" }}>{v}</dd>
                      <dt className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-black/45">{k}</dt>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center justify-between gap-3 px-4 py-3 text-[12.5px] text-black/60">
                  <span>{u?.n ? <><b className="text-black">{u.n}</b> fuvar · {km(u.km)}</> : "Még nincs fuvar ezzel"}</span>
                  <span className="font-mono text-[11px]">{hu(f.v.consumption)} l/100 km</span>
                </div>
                <div className="mt-auto flex items-stretch border-t-2 border-black">
                  <Link href={`/planner?vehicle=${encodeURIComponent(f.id)}`} className="flex flex-1 items-center justify-center gap-2 bg-black py-3 text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-white transition hover:bg-[#00ff9d] hover:text-black">
                    Tervezés ezzel <span className="font-mono">→</span>
                  </Link>
                  <button onClick={() => { setIsNew(false); setEdit({ ...f, v: { ...f.v } }); }} title="Szerkesztés" className="border-l-2 border-black px-3.5 text-[14px] transition hover:bg-[#00ff9d]">✎</button>
                  <button onClick={() => duplicate(f)} title="Duplikálás" className="border-l-2 border-black px-3.5 text-[14px] transition hover:bg-[#00ff9d]">⧉</button>
                  <button onClick={() => remove(f)} title="Törlés" className="border-l-2 border-black px-3.5 text-[14px] transition hover:bg-rose-500 hover:text-white">🗑</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="relative overflow-hidden border-2 border-dashed border-black/30 bg-white p-10 text-center md:p-14">
          <TruckSide v={VEHICLE_PRESETS[0].v} className="mx-auto w-full max-w-sm text-black" />
          <p className="mt-6 text-[20px] font-black uppercase tracking-tight text-black" style={{ fontFamily: "var(--font-brand)" }}>Még nincs mentett járműved</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-black/55">Add meg a kamionod adatait egyszer, és a tervező mindig ezzel számol: aluljárók, tömeg- és tengelykorlátok, EURO-osztály szerinti útdíj.</p>
          <button onClick={openNew} className="btn-primary mt-7">+ Első jármű hozzáadása</button>
        </div>
      )}

      {edit && <Editor item={edit} isNew={isNew} onClose={() => setEdit(null)} onSave={save} names={fleet.filter((f) => f.id !== edit.id).map((f) => f.name.toLowerCase())} />}
    </div>
  );
}

function Editor({ item, isNew, onClose, onSave, names }: { item: FleetItem; isNew: boolean; onClose: () => void; onSave: (f: FleetItem) => void; names: string[] }) {
  const [name, setName] = useState(item.name);
  const [v, setV] = useState<Vehicle>(item.v);
  const [preset, setPreset] = useState<string>(() => VEHICLE_PRESETS.find((p) => JSON.stringify(p.v) === JSON.stringify(item.v))?.id ?? "");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const errors = useMemo(() => {
    const e: string[] = [];
    if (!name.trim()) e.push("Adj nevet a járműnek (pl. rendszám vagy típus).");
    else if (names.includes(name.trim().toLowerCase())) e.push("Ilyen nevű jármű már van a flottában.");
    for (const f of FIELDS) { const x = v[f.k] as number; if (!Number.isFinite(x) || x < f.min || x > f.max) e.push(`${f.l}: ${f.min}–${f.max} ${f.unit} között.`); }
    if (v.axleLoad > v.weight) e.push("A tengelyterhelés nem lehet nagyobb az össztömegnél.");
    return e;
  }, [name, v, names]);
  const set = (k: keyof Vehicle, x: number | boolean | string) => { setV((o) => ({ ...o, [k]: x })); setPreset(""); };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal aria-label={isNew ? "Új jármű" : "Jármű szerkesztése"}>
      <div className="rr-up flex max-h-[94dvh] w-full max-w-3xl flex-col border-2 border-black bg-white shadow-[10px_10px_0_0_#00ff9d]" style={{ animationDuration: "0.35s" }}>
        <div className="relative shrink-0 overflow-hidden bg-[#050505] px-5 pb-2 pt-5 text-white md:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#00ff9d]">{isNew ? "Új jármű" : "Szerkesztés"}</div>
              <div className="mt-1.5 text-[24px] font-black uppercase leading-none tracking-tight" style={{ fontFamily: "var(--font-brand)" }}>{name.trim() || "Névtelen jármű"}</div>
            </div>
            <button onClick={onClose} aria-label="Bezárás" className="text-[24px] leading-none text-white/50 transition hover:text-white">×</button>
          </div>
          <TruckSide v={v} className="mx-auto mt-1 w-full max-w-md text-white" />
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 md:px-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="label-xs">Név · rendszám vagy típus</span>
              <input autoFocus={isNew} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="pl. ABC-123 · Volvo FH 500" className="input-lg" />
            </label>
            <label className="block">
              <span className="label-xs">Kiindulás sablonból</span>
              <select value={preset} onChange={(e) => { const p = VEHICLE_PRESETS.find((x) => x.id === e.target.value); setPreset(e.target.value); if (p) { setV({ ...p.v }); if (!name.trim()) setName(p.name); } }} className="input-lg cursor-pointer">
                <option value="">Egyedi adatok</option>
                {VEHICLE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            {FIELDS.map((f) => (
              <label key={f.k} className="block">
                <span className="label-xs">{f.l}</span>
                <span className="flex items-baseline gap-1.5 border-b-2 border-black/15 focus-within:border-black">
                  <input type="number" inputMode="decimal" min={f.min} max={f.max} step={f.step} value={v[f.k] as number}
                    onChange={(e) => set(f.k, e.target.value === "" ? NaN : Number(e.target.value))}
                    className="w-full min-w-0 bg-transparent py-2.5 text-[18px] font-bold tabular-nums text-black outline-none" />
                  <span className="font-mono text-[11px] font-bold text-black/40">{f.unit}</span>
                </span>
              </label>
            ))}
            <label className="block">
              <span className="label-xs">EURO-osztály</span>
              <select value={v.euro} onChange={(e) => set("euro", e.target.value as EuroClass)} className="w-full cursor-pointer border-b-2 border-black/15 bg-transparent py-3 text-[15px] font-bold text-black outline-none focus:border-black">
                {EURO.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
              </select>
            </label>
          </div>
          <button type="button" onClick={() => set("hazmat", !v.hazmat)} className={`flex w-full items-center justify-between gap-4 border-2 px-4 py-3.5 text-left transition ${v.hazmat ? "border-black bg-[#ff8a00]/15" : "border-black/15 hover:border-black"}`}>
            <span>
              <span className="block text-[14px] font-black uppercase tracking-tight text-black">Veszélyes áru (ADR)</span>
              <span className="block text-[12.5px] text-black/55">Elkerüli az ADR-rel tiltott alagutakat és útszakaszokat.</span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 transition ${v.hazmat ? "bg-black" : "bg-black/15"}`}>
              <span className={`absolute top-1 h-4 w-4 transition-all ${v.hazmat ? "left-6 bg-[#ff8a00]" : "left-1 bg-white"}`} />
            </span>
          </button>
          {errors.length > 0 && name.trim() !== "" && <ul className="space-y-1 text-[13px] text-rose-600">{errors.map((e) => <li key={e}>• {e}</li>)}</ul>}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 border-t-2 border-black px-5 py-4 md:px-7">
          <button onClick={onClose} className="px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.15em] text-black/55 hover:text-black">Mégse</button>
          <button disabled={errors.length > 0} onClick={() => onSave({ id: item.id, name: name.trim(), v })} className="btn-primary">{isNew ? "Hozzáadás a flottához" : "Mentés"}</button>
        </div>
      </div>
    </div>
  );
}
