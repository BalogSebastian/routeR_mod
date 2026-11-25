"use client";

import { useMemo, useState } from "react";
import { COUNTRY_NAMES } from "@/lib/country-names";
import { eur, flag } from "@/lib/format";
import PrintPortal, { printDoc } from "./PrintPortal";

export interface ReportTrip {
  id: string; name: string; from: string; to: string; date: string; km: number; toll: number; total: number;
  fuel?: number; driver?: number; vehicleCost?: number; ferry?: number; countries: string[]; vehicle: string;
}
type Preset = "month" | "prevMonth" | "quarter" | "year" | "prevYear" | "all" | "custom";
type Group = "vehicle" | "route" | "country";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function range(p: Preset): [string, string] {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  switch (p) {
    case "month": return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
    case "prevMonth": return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
    case "quarter": { const q = Math.floor(m / 3) * 3; return [iso(new Date(y, q, 1)), iso(new Date(y, q + 3, 0))]; }
    case "year": return [`${y}-01-01`, `${y}-12-31`];
    case "prevYear": return [`${y - 1}-01-01`, `${y - 1}-12-31`];
    default: return ["2000-01-01", "2100-12-31"];
  }
}
const PRESETS: [Preset, string][] = [["month", "Ez a hónap"], ["prevMonth", "Múlt hónap"], ["quarter", "Negyedév"], ["year", "Idén"], ["prevYear", "Tavaly"], ["all", "Mind"], ["custom", "Egyedi"]];
const n0 = (x: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(x);
const csvNum = (x: number) => x.toFixed(2).replace(".", ",");

export default function ReportView({ trips, company }: { trips: ReportTrip[]; company: string }) {
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState<[string, string]>(() => range("month"));
  const [group, setGroup] = useState<Group>("vehicle");
  const [sort, setSort] = useState<"date" | "total" | "km">("date");
  const [from, to] = preset === "custom" ? custom : range(preset);

  const list = useMemo(() => trips.filter((t) => t.date >= from && t.date <= to), [trips, from, to]);
  const tot = useMemo(() => {
    const s = { n: list.length, km: 0, toll: 0, total: 0, fuel: 0, driver: 0, veh: 0, ferry: 0, split: 0 };
    for (const t of list) {
      s.km += t.km; s.toll += t.toll; s.total += t.total;
      if (t.fuel !== undefined) { s.split += t.total; s.fuel += t.fuel; s.driver += t.driver ?? 0; s.veh += t.vehicleCost ?? 0; s.ferry += t.ferry ?? 0; }
    }
    return s;
  }, [list]);

  // idősor: 62 napig naponta, egyébként havonta
  const series = useMemo(() => {
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400_000;
    const span = preset === "all" ? (list.length ? (new Date(list[0].date).getTime() - new Date(list[list.length - 1].date).getTime()) / 86400_000 : 0) : days;
    const monthly = span > 62;
    const map = new Map<string, { k: string; toll: number; other: number; n: number }>();
    for (const t of list) {
      const k = monthly ? t.date.slice(0, 7) : t.date;
      const e = map.get(k) ?? { k, toll: 0, other: 0, n: 0 };
      e.toll += t.toll; e.other += Math.max(0, t.total - t.toll); e.n += 1;
      map.set(k, e);
    }
    const out = [...map.values()].sort((a, b) => a.k.localeCompare(b.k));
    return { monthly, out, max: Math.max(1, ...out.map((x) => x.toll + x.other)) };
  }, [list, from, to, preset]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; n: number; km: number; toll: number; total: number }>();
    for (const t of list) {
      const keys = group === "vehicle" ? [t.vehicle] : group === "route" ? [`${t.from} → ${t.to}`] : t.countries;
      for (const k of keys) {
        const e = map.get(k) ?? { key: k, label: group === "country" ? `${flag(k)} ${COUNTRY_NAMES[k] ?? k}` : k, n: 0, km: 0, toll: 0, total: 0 };
        e.n += 1;
        if (group !== "country") { e.km += t.km; e.toll += t.toll; e.total += t.total; }
        map.set(k, e);
      }
    }
    const out = [...map.values()].sort((a, b) => (group === "country" ? b.n - a.n : b.total - a.total));
    return { out, max: Math.max(1, ...out.map((x) => (group === "country" ? x.n : x.total))) };
  }, [list, group]);

  const sorted = useMemo(() => [...list].sort((a, b) => (sort === "date" ? b.date.localeCompare(a.date) : sort === "total" ? b.total - a.total : b.km - a.km)), [list, sort]);

  const exportCsv = () => {
    const head = ["Dátum", "Fuvar", "Honnan", "Hová", "Km", "Útdíj (EUR)", "Üzemanyag (EUR)", "Sofőr (EUR)", "Jármű (EUR)", "Komp (EUR)", "Összköltség (EUR)", "EUR/km", "Jármű", "Országok"];
    const rows = sorted.map((t) => [t.date, t.name, t.from, t.to, String(Math.round(t.km)), csvNum(t.toll), t.fuel !== undefined ? csvNum(t.fuel) : "", t.driver !== undefined ? csvNum(t.driver) : "", t.vehicleCost !== undefined ? csvNum(t.vehicleCost) : "", t.ferry !== undefined ? csvNum(t.ferry) : "", csvNum(t.total), t.km ? csvNum(t.total / t.km) : "", t.vehicle, t.countries.join(" ")]);
    const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const csv = "﻿" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `routeR-kimutatas-${from}_${to}.csv`.replace("2000-01-01_2100-12-31", "osszes"); a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { k: "Fuvar", v: n0(tot.n) },
    { k: "Kilométer", v: n0(tot.km) },
    { k: "Útdíj", v: eur(tot.toll) },
    { k: "Összköltség", v: eur(tot.total) },
    { k: "Átlag €/km", v: tot.km ? (tot.total / tot.km).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "–" },
    { k: "Útdíj aránya", v: tot.total ? `${Math.round((tot.toll / tot.total) * 100)}%` : "–" },
  ];
  const structure = tot.split > 0 ? [
    { k: "Üzemanyag", v: tot.fuel, c: "#000" },
    { k: "Sofőr", v: tot.driver, c: "#00c97b" },
    { k: "Jármű", v: tot.veh, c: "#7a7a72" },
    { k: "Útdíj", v: tot.split - tot.fuel - tot.driver - tot.veh - tot.ferry, c: "#00ff9d" },
    { k: "Komp", v: tot.ferry, c: "#c9c9c0" },
  ].filter((x) => x.v > 0.5) : [];

  const periodLabel = preset === "all" ? "teljes időszak" : `${from.replaceAll("-", ".")}. – ${to.replaceAll("-", ".")}.`;
  const btn = (on: boolean) => `border-2 px-3.5 py-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] transition ${on ? "border-black bg-black text-[#00ff9d]" : "border-black/20 bg-white text-black hover:border-black"}`;

  return (
    <div className="space-y-6">
      <PrintPortal><PrintReport company={company} period={periodLabel} kpis={kpis} rows={sorted} /></PrintPortal>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(([p, l]) => <button key={p} onClick={() => setPreset(p)} className={btn(preset === p)}>{l}</button>)}
        {preset === "custom" && (
          <span className="flex items-center gap-2">
            <input type="date" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} className="border-2 border-black/20 bg-white px-2 py-1.5 text-[13px]" />
            <span>–</span>
            <input type="date" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} className="border-2 border-black/20 bg-white px-2 py-1.5 text-[13px]" />
          </span>
        )}
        <span className="ml-auto flex gap-2">
          <button onClick={exportCsv} disabled={!list.length} className="btn-primary">⬇ Excel (CSV)</button>
          <button onClick={() => printDoc(`routeR kimutatás ${periodLabel}`)} disabled={!list.length} className="border-2 border-black bg-white px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.14em] transition hover:bg-[#00ff9d] disabled:opacity-40">⎙ Nyomtatás</button>
        </span>
      </div>

      <section className="grid grid-cols-2 border-2 border-black bg-white md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((x, i) => (
          <div key={x.k} className="rr-up border-b-2 border-r-2 border-black p-5 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r-2 md:[&:nth-child(3n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(3n)]:border-r-2 xl:last:border-r-0" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="text-[clamp(1.3rem,2.4vw,1.9rem)] font-black leading-none tracking-tighter tabular-nums" style={{ fontFamily: "var(--font-brand)" }}>{x.v}</div>
            <div className="mt-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-black/50">{x.k}</div>
          </div>
        ))}
      </section>

      {list.length === 0 ? (
        <div className="border-2 border-dashed border-black/30 bg-white p-12 text-center">
          <p className="text-[19px] font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-brand)" }}>Ebben az időszakban nincs fuvar</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-black/55">A kimutatás a mentett fuvarokból készül, a tervezett indulás napja szerint. Válassz másik időszakot, vagy ments fuvarokat a tervezőből.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <section className="border-2 border-black bg-white p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[15px] font-black uppercase tracking-tight">Költség {series.monthly ? "havonta" : "naponta"}</h2>
                <span className="flex gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black/50"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-[#00ff9d]" />útdíj</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-black" />egyéb</span></span>
              </div>
              <div className="flex h-48 items-end gap-1.5">
                {series.out.map((x, i) => (
                  <div key={x.k} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${x.k}: ${x.n} fuvar · ${eur(x.toll + x.other)} (útdíj ${eur(x.toll)})`}>
                    <div className="flex origin-bottom flex-col [animation:rr-grow_0.9s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ height: `${((x.toll + x.other) / series.max) * 100}%`, animationDelay: `${0.2 + i * 0.03}s` }}>
                      <div className="bg-[#00ff9d] transition group-hover:brightness-90" style={{ height: `${(x.toll / Math.max(1, x.toll + x.other)) * 100}%` }} />
                      <div className="flex-1 bg-black transition group-hover:bg-[#333]" />
                    </div>
                    <div className="mt-1.5 truncate text-center font-mono text-[9.5px] font-bold text-black/45">{series.monthly ? new Date(`${x.k}-01`).toLocaleDateString("hu-HU", { month: "short" }) : x.k.slice(8)}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="border-2 border-black bg-white p-5 md:p-6">
              <h2 className="mb-4 text-[15px] font-black uppercase tracking-tight">Költségszerkezet</h2>
              {structure.length ? (
                <>
                  <div className="flex h-5 w-full overflow-hidden border-2 border-black">
                    {structure.map((s) => <div key={s.k} style={{ width: `${(s.v / tot.split) * 100}%`, background: s.c }} title={`${s.k}: ${eur(s.v)}`} />)}
                  </div>
                  <ul className="mt-4 space-y-2 text-[13px]">
                    {structure.map((s) => (
                      <li key={s.k} className="flex items-center gap-2"><span className="h-3 w-3 border border-black/20" style={{ background: s.c }} /><span className="flex-1 font-semibold">{s.k}</span><span className="tabular-nums">{eur(s.v)}</span><span className="w-10 text-right font-mono text-[11px] text-black/45">{Math.round((s.v / tot.split) * 100)}%</span></li>
                    ))}
                  </ul>
                  {tot.split < tot.total - 1 && <p className="mt-3 text-[11.5px] text-black/45">A bontás csak a mostantól mentett fuvaroknál áll rendelkezésre ({Math.round((tot.split / tot.total) * 100)}% a költségekből).</p>}
                </>
              ) : <p className="text-[13px] leading-relaxed text-black/55">A költségbontás (üzemanyag, sofőr, jármű, útdíj) az újonnan mentett fuvaroknál jelenik meg. Mentsd újra a tervezőben a fuvart, és itt is látszik.</p>}
            </section>
          </div>

          <section className="border-2 border-black bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-black p-4">
              <h2 className="mr-auto text-[15px] font-black uppercase tracking-tight">Bontás</h2>
              {([["vehicle", "Járművenként"], ["route", "Útvonalanként"], ["country", "Országonként"]] as [Group, string][]).map(([g, l]) => <button key={g} onClick={() => setGroup(g)} className={btn(group === g)}>{l}</button>)}
            </div>
            <ul className="divide-y divide-black/10">
              {groups.out.slice(0, 30).map((g, i) => (
                <li key={g.key} className="relative grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[minmax(0,1fr)_90px_110px_110px_120px]">
                  <span aria-hidden className="absolute inset-y-0 left-0 origin-left bg-[#00ff9d]/20 [animation:rr-bar_0.9s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ width: `${((group === "country" ? g.n : g.total) / groups.max) * 100}%`, animationDelay: `${i * 0.03}s` }} />
                  <span className="relative truncate font-bold">{g.label}</span>
                  <span className="relative text-right font-mono text-[12px] text-black/60">{g.n} fuvar</span>
                  {group !== "country" && <>
                    <span className="relative hidden text-right font-mono text-[12px] text-black/60 md:block">{n0(g.km)} km</span>
                    <span className="relative hidden text-right font-mono text-[12px] text-black/60 md:block">útdíj {eur(g.toll)}</span>
                    <span className="relative hidden text-right font-black tabular-nums md:block">{eur(g.total)}</span>
                  </>}
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-x-auto border-2 border-black bg-white">
            <div className="flex items-center gap-2 border-b-2 border-black p-4">
              <h2 className="mr-auto text-[15px] font-black uppercase tracking-tight">Fuvarok ({list.length})</h2>
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.15em] text-black/45">Rendezés</span>
              {([["date", "Dátum"], ["total", "Költség"], ["km", "Km"]] as const).map(([s, l]) => <button key={s} onClick={() => setSort(s)} className={btn(sort === s)}>{l}</button>)}
            </div>
            <table className="w-full min-w-[720px] text-[13px]">
              <thead><tr className="border-b border-black/15 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-black/45"><th className="px-4 py-2">Dátum</th><th className="px-4 py-2">Fuvar</th><th className="px-4 py-2">Jármű</th><th className="px-4 py-2 text-right">Km</th><th className="px-4 py-2 text-right">Útdíj</th><th className="px-4 py-2 text-right">Összesen</th><th className="px-4 py-2 text-right">€/km</th></tr></thead>
              <tbody>
                {sorted.slice(0, 300).map((t) => (
                  <tr key={t.id} className="border-b border-black/[0.06] transition hover:bg-[#00ff9d]/10">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-black/60">{t.date.replaceAll("-", ".")}.</td>
                    <td className="px-4 py-2.5"><a href={`/planner?trip=${t.id}`} className="font-bold hover:underline">{t.from} → {t.to}</a></td>
                    <td className="px-4 py-2.5 text-black/60">{t.vehicle}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{n0(t.km)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{eur(t.toll)}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{eur(t.total)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-black/60">{t.km ? (t.total / t.km).toFixed(2).replace(".", ",") : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function PrintReport({ company, period, kpis, rows }: { company: string; period: string; kpis: { k: string; v: string }[]; rows: ReportTrip[] }) {
  return (
    <article className="rr-doc bg-white p-2 text-[11px] text-black" style={{ fontFamily: "var(--font-driver), system-ui, sans-serif" }}>
      <header className="flex items-end justify-between border-b-4 border-black pb-3">
        <div><div className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/50">Fuvar-kimutatás</div><div className="text-[24px] font-black uppercase">{company}</div></div>
        <div className="text-right"><div className="font-bold">{period}</div><div className="text-black/50">Készült: {new Date().toLocaleDateString("hu-HU")} · routeR</div></div>
      </header>
      <div className="mt-4 grid grid-cols-6 gap-2">{kpis.map((x) => <div key={x.k} className="border-t-2 border-black pt-1"><div className="text-[15px] font-black">{x.v}</div><div className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/50">{x.k}</div></div>)}</div>
      <table className="mt-5 w-full border-collapse">
        <thead><tr className="border-b-2 border-black text-left text-[9px] uppercase tracking-[0.15em]"><th className="py-1">Dátum</th><th>Fuvar</th><th>Jármű</th><th className="text-right">Km</th><th className="text-right">Útdíj</th><th className="text-right">Összesen</th></tr></thead>
        <tbody>{rows.map((t) => <tr key={t.id} className="border-b border-black/10"><td className="py-1">{t.date}</td><td>{t.from} → {t.to}</td><td>{t.vehicle}</td><td className="text-right">{n0(t.km)}</td><td className="text-right">{eur(t.toll)}</td><td className="text-right font-bold">{eur(t.total)}</td></tr>)}</tbody>
      </table>
    </article>
  );
}
