"use client";

import { useMemo, useState } from "react";
import { capacity, COLORS, pack, PALLET_PRESETS, TRAILERS, type PalletType } from "@/lib/loading";

const uid = () => Math.random().toString(36).slice(2, 8);
const n1 = (x: number) => x.toLocaleString("hu-HU", { maximumFractionDigits: 1 });

export default function LoadingTool() {
  const [trailerId, setTrailerId] = useState(TRAILERS[0].id);
  const [types, setTypes] = useState<PalletType[]>([{ id: "p1", name: "EUR raklap", l: 120, w: 80, qty: 26, kg: 450, stack: false, color: COLORS[0] }]);
  const trailer = TRAILERS.find((t) => t.id === trailerId)!;
  const res = useMemo(() => pack(trailer, types), [trailer, types]);
  const totalLen = trailer.decks.reduce((a, b) => a + b, 0);
  const usedLen = res.used.reduce((a, b) => a + b, 0);
  const notPlaced = types.reduce((a, t) => a + (res.perType[t.id]?.left ?? 0), 0);
  const placedQty = types.reduce((a, t) => a + (res.perType[t.id]?.placed ?? 0), 0);
  const over = res.weight > trailer.payload;
  const update = (id: string, patch: Partial<PalletType>) => setTypes((x) => x.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const add = (p: (typeof PALLET_PRESETS)[number]) => setTypes((x) => [...x, { id: uid(), name: p.name, l: p.l, w: p.w, qty: 4, kg: 400, stack: false, color: COLORS[x.length % COLORS.length] }]);

  const kpis = [
    { k: "Raklap a rakfelületen", v: `${placedQty}`, warn: notPlaced > 0 },
    { k: "Rakméter (LDM)", v: n1(res.ldm) },
    { k: "Foglalt hossz", v: `${n1(usedLen / 100)} / ${n1(totalLen / 100)} m` },
    { k: "Tömeg", v: `${n1(res.weight / 1000)} / ${n1(trailer.payload / 1000)} t`, warn: over },
  ];
  const cogText = res.cog === null ? "" : res.cog < 0.3 ? "elöl nehéz: tengelyterhelés-ellenőrzés javasolt" : res.cog > 0.62 ? "hátul nehéz: a nyerges tengely tehermentesül, ellenőrizd" : "kiegyensúlyozott";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TRAILERS.map((t) => (
          <button key={t.id} onClick={() => setTrailerId(t.id)} className={`border-2 px-3.5 py-2 text-[12px] font-bold transition ${trailerId === t.id ? "border-black bg-black text-[#00ff9d]" : "border-black/15 bg-white text-black/70 hover:border-black"}`}>{t.name}</button>
        ))}
      </div>

      <section className="grid grid-cols-2 border-2 border-black bg-white lg:grid-cols-4">
        {kpis.map((x, i) => (
          <div key={x.k} className={`p-5 ${i % 2 === 0 ? "border-r-2 border-black" : ""} ${i < 2 ? "border-b-2 border-black lg:border-b-0" : ""} lg:border-r-2 lg:last:border-r-0`}>
            <div className={`text-[clamp(1.4rem,2.6vw,2.1rem)] font-black leading-none tracking-tighter tabular-nums ${x.warn ? "text-rose-600" : ""}`} style={{ fontFamily: "var(--font-brand)" }}>{x.v}</div>
            <div className="mt-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-black/50">{x.k}</div>
          </div>
        ))}
      </section>

      {/* felülnézet */}
      <section className="overflow-hidden border-2 border-black bg-[#050505] p-4 text-white md:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/50">
          <span>◀ Fülke felől · felülnézet</span>
          <span>{trailer.width} cm széles · {trailer.decks.map((d) => `${n1(d / 100)} m`).join(" + ")}</span>
        </div>
        <div className="space-y-3">
          {trailer.decks.map((len, d) => (
            <svg key={`${trailerId}-${d}`} viewBox={`-12 -12 ${len + 24} ${trailer.width + 24}`} className="w-full" role="img" aria-label={`Rakfelület ${d + 1}`}>
              <defs>
                <pattern id={`g${d}`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" /></pattern>
              </defs>
              <rect x="-6" y="-6" width={len + 12} height={trailer.width + 12} fill="none" stroke="#00ff9d" strokeWidth="3" />
              <rect x="0" y="0" width={len} height={trailer.width} fill={`url(#g${d})`} />
              {res.used[d] > 0 && <rect x={res.used[d]} y={0} width={Math.max(0, len - res.used[d])} height={trailer.width} fill="rgba(255,255,255,0.025)" />}
              {res.placed.filter((p) => p.deck === d).map((p, i) => {
                const t = types.find((x) => x.id === p.type)!;
                const dark = t.color === "#0a0a0a";
                return (
                  <g key={`${p.n}-${t.qty}-${t.l}`} className="rr-pallet" style={{ animationDelay: `${Math.min(i, 40) * 0.025}s` }}>
                    <rect x={p.x + 2} y={p.y + 1} width={p.l - 4} height={p.w - 2} fill={t.color} stroke={dark ? "#00ff9d" : "#000"} strokeWidth="2" />
                    {/* raklap-deszkák */}
                    <path d={`M${p.x + 2} ${p.y + p.w / 2}H${p.x + p.l - 2}`} stroke={dark ? "rgba(0,255,157,.4)" : "rgba(0,0,0,.25)"} strokeWidth="1.5" />
                    {p.stacked && <text x={p.x + p.l / 2} y={p.y + p.w / 2 + 7} textAnchor="middle" fontSize="20" fontWeight="900" fill={dark ? "#00ff9d" : "#000"} fontFamily="ui-monospace,Menlo,monospace">×2</text>}
                  </g>
                );
              })}
              {res.cog !== null && trailer.decks.length === 1 && (
                <g>
                  <line x1={res.cog * len} x2={res.cog * len} y1={-10} y2={trailer.width + 10} stroke="#ff5c8a" strokeWidth="3" strokeDasharray="8 6" />
                  <circle cx={res.cog * len} cy={trailer.width / 2} r="9" fill="#ff5c8a" stroke="#000" strokeWidth="2" />
                </g>
              )}
            </svg>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-white/60">
          {res.cog !== null && trailer.decks.length === 1 && <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#ff5c8a]" />Súlypont: a hossz {Math.round(res.cog * 100)}%-ánál · {cogText}</span>}
          {notPlaced > 0 && <span className="font-bold text-rose-400">⚠ {notPlaced} raklap nem fér fel</span>}
          {over && <span className="font-bold text-rose-400">⚠ Túllépi a {n1(trailer.payload / 1000)} t hasznos terhelést</span>}
        </div>
      </section>

      {/* raklapok */}
      <section className="border-2 border-black bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-black p-4">
          <h2 className="mr-auto text-[15px] font-black uppercase tracking-tight">Raklapok</h2>
          {PALLET_PRESETS.map((p) => <button key={p.name} onClick={() => add(p)} className="border-2 border-black/15 px-3 py-1.5 text-[12px] font-bold transition hover:border-black hover:bg-[#00ff9d]">+ {p.name} <span className="font-mono text-[10.5px] text-black/45">{p.l}×{p.w}</span></button>)}
          <button onClick={() => add({ name: "Egyedi", l: 100, w: 100 })} className="border-2 border-black/15 px-3 py-1.5 text-[12px] font-bold transition hover:border-black hover:bg-[#00ff9d]">+ Egyedi</button>
        </div>
        <ul className="divide-y divide-black/10">
          {types.map((t) => {
            const r = res.perType[t.id];
            return (
              <li key={t.id} className="grid grid-cols-2 items-end gap-4 p-4 md:grid-cols-[22px_1.4fr_repeat(4,1fr)_auto_auto]">
                <span className="col-span-2 h-[22px] w-[22px] border-2 border-black md:col-span-1" style={{ background: t.color }} />
                <label className="col-span-2 block md:col-span-1"><span className="label-xs">Megnevezés</span><input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} className="w-full border-b-2 border-black/15 bg-transparent py-1.5 text-[15px] font-bold outline-none focus:border-black" /></label>
                {([["qty", "Darab", 1], ["l", "Hossz (cm)", 1], ["w", "Szél. (cm)", 1], ["kg", "Kg / db", 10]] as const).map(([k, l, step]) => (
                  <label key={k} className="block"><span className="label-xs">{l}</span>
                    <input type="number" min={0} step={step} value={t[k]} onChange={(e) => update(t.id, { [k]: Math.max(0, Number(e.target.value)) } as Partial<PalletType>)} className="w-full border-b-2 border-black/15 bg-transparent py-1.5 text-[17px] font-bold tabular-nums outline-none focus:border-black" /></label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-[12.5px] font-semibold"><input type="checkbox" checked={t.stack} onChange={(e) => update(t.id, { stack: e.target.checked })} className="h-4 w-4 accent-black" />Rakható (×2)</label>
                <div className="flex items-center gap-3 pb-1.5">
                  <span className={`font-mono text-[11px] font-bold ${r?.left ? "text-rose-600" : "text-[#00a866]"}`}>{r ? (r.left ? `${r.left} kimarad` : "✓ felfér") : ""}</span>
                  <button onClick={() => setTypes((x) => x.filter((y) => y.id !== t.id))} title="Törlés" className="text-black/35 hover:text-rose-600">✕</button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* kapacitás-gyorstábla */}
      <section className="border-2 border-black bg-white p-5">
        <h2 className="mb-3 text-[15px] font-black uppercase tracking-tight">Mennyi fér fel? · egy szinten</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead><tr className="border-b-2 border-black text-left font-mono text-[10px] uppercase tracking-[0.15em] text-black/50"><th className="py-2">Jármű</th>{PALLET_PRESETS.slice(0, 3).map((p) => <th key={p.name} className="py-2 text-right">{p.name} <span className="text-black/35">{p.l}×{p.w}</span></th>)}</tr></thead>
            <tbody>
              {TRAILERS.map((t) => (
                <tr key={t.id} className={`border-b border-black/10 ${t.id === trailerId ? "bg-[#00ff9d]/15 font-bold" : ""}`}>
                  <td className="py-2">{t.name}</td>
                  {PALLET_PRESETS.slice(0, 3).map((p) => <td key={p.name} className="py-2 text-right font-mono tabular-nums">{capacity(t, p.l, p.w)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-black/45">Elméleti érték a belső méretekből, rakodási hézag nélkül. A rakomány rögzítéséről és a tengelyterhelésről a rakodást végző felel; a súlypont csak tájékoztató.</p>
      </section>
    </div>
  );
}
