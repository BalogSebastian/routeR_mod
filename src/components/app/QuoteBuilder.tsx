"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { COUNTRY_NAMES } from "@/lib/country-names";
import { dt, flag } from "@/lib/format";
import PrintPortal, { printDoc } from "./PrintPortal";

export interface QuoteTrip {
  id: string; name: string; from: string; to: string;
  summary: { distanceKm: number; roadKm: number; tollEur: number; totalEur: number; drivingMin: number; days: number; arrival: string; countries: string[]; fuelEur?: number; driverEur?: number; vehicleEur?: number; ferryEur?: number };
  weight?: number; euro?: string; hazmat?: boolean; departure?: string;
}
interface Me { name: string; email: string; company: string; phone: string }
interface Extra { id: string; name: string; eur: number }
type Mode = "margin" | "perKm" | "fixed";
type Vat = "27" | "rc" | "0";

const PREFS = "routeR.quote.v1";
const EXTRAS = ["Várakozás / állásidő", "Plusz felrakó- vagy lerakóhely", "ADR felár", "Expressz felár", "Hűtött szállítás"];
const uid = () => Math.random().toString(36).slice(2, 8);
const money = (n: number, cur: "EUR" | "HUF") => new Intl.NumberFormat("hu-HU", { style: "currency", currency: cur, maximumFractionDigits: cur === "HUF" ? 0 : 2, minimumFractionDigits: cur === "HUF" ? 0 : 2 }).format(n);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, d: number) => { const x = new Date(iso); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const huDate = (iso: string) => new Date(iso).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });

interface Prefs { margin: number; perKm: number; vat: Vat; cur: "EUR" | "HUF"; validDays: number; payDays: number; tollLine: boolean; notes: string; me?: Partial<Me> }
const DEFAULTS: Prefs = { margin: 18, perKm: 1.45, vat: "rc", cur: "EUR", validDays: 7, payDays: 30, tollLine: false, notes: "Az ár tartalmazza az útdíjakat, az üzemanyagot és a gépkocsivezető költségeit. Az ajánlat a megadott útvonalra és rakományra érvényes; a rakodási időn felüli várakozást külön számlázzuk." };

function loadPrefs(): Prefs {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(PREFS) ?? "{}") as Partial<Prefs>) }; } catch { return DEFAULTS; }
}

export default function QuoteBuilder({ trips, initialTrip, eurHuf, me: meDefault }: { trips: QuoteTrip[]; initialTrip?: string; eurHuf: number; me: Me }) {
  const [tripId, setTripId] = useState(() => trips.find((t) => t.id === initialTrip)?.id ?? trips[0]?.id ?? "");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("margin");
  const [fixed, setFixed] = useState(0);
  const [rate, setRate] = useState(eurHuf);
  const [client, setClient] = useState({ name: "", address: "", contact: "" });
  const [cargo, setCargo] = useState("");
  const [extras, setExtras] = useState<Extra[]>([]);
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(today);

  // böngészőben megjegyzett beállítások (árrés, ÁFA, saját adatok) – kényelmi funkció, nem kötelező
  useEffect(() => {
    const p = loadPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(p); setLoaded(true);
    setNumber(`AJ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* tiltott tároló */ }
  }, [prefs, loaded]);
  const me: Me = { ...meDefault, ...Object.fromEntries(Object.entries(prefs.me ?? {}).filter(([, v]) => v)) } as Me;
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));
  const setMe = (k: keyof Me, v: string) => setPrefs((p) => ({ ...p, me: { ...p.me, [k]: v } }));

  const t = trips.find((x) => x.id === tripId);
  const calc = useMemo(() => {
    if (!t) return null;
    const cost = t.summary.totalEur;
    const extrasEur = extras.reduce((a, e) => a + (Number.isFinite(e.eur) ? e.eur : 0), 0);
    const freight = mode === "margin" ? cost * (1 + prefs.margin / 100) : mode === "perKm" ? prefs.perKm * t.summary.distanceKm : fixed || cost;
    const net = freight + extrasEur;
    const profit = freight - cost;
    const vatRate = prefs.vat === "27" ? 0.27 : 0;
    return { cost, freight, extrasEur, net, profit, marginPct: freight ? (profit / freight) * 100 : 0, markupPct: cost ? (profit / cost) * 100 : 0, perKm: t.summary.distanceKm ? net / t.summary.distanceKm : 0, vat: net * vatRate, gross: net * (1 + vatRate) };
  }, [t, extras, mode, prefs.margin, prefs.perKm, prefs.vat, fixed]);

  const k = prefs.cur === "HUF" ? rate : 1;
  const m = (eurValue: number) => money(eurValue * k, prefs.cur);

  if (!trips.length) {
    return (
      <div className="border-2 border-dashed border-black/30 bg-white p-12 text-center">
        <p className="text-[20px] font-black uppercase tracking-tight text-black" style={{ fontFamily: "var(--font-brand)" }}>Előbb ments egy fuvart</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-black/55">Az ajánlat egy mentett fuvar önköltségéből készül. Tervezd meg az útvonalat, mentsd el, és itt egy kattintással ajánlatot készíthetsz belőle.</p>
        <a href="/planner" className="btn-primary mt-7">Útvonal tervezése</a>
      </div>
    );
  }

  const doc = t && calc ? (
    <QuoteDoc t={t} calc={calc} m={m} me={me} client={client} cargo={cargo} extras={extras} number={number} date={date} prefs={prefs} />
  ) : null;

  const field = "w-full border-b-2 border-black/15 bg-transparent py-2 text-[15px] font-medium text-black outline-none focus:border-black";
  const seg = (on: boolean) => `flex-1 border-2 px-2 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition ${on ? "border-black bg-black text-[#00ff9d]" : "border-black/15 bg-white text-black/60 hover:border-black"}`;

  return (
    <div className="grid gap-8 xl:grid-cols-[400px_1fr]">
      <PrintPortal>{doc}</PrintPortal>
      {/* vezérlők */}
      <div className="space-y-6">
        <section className="border-2 border-black bg-white p-5">
          <h2 className="mb-3 text-[14px] font-black uppercase tracking-tight">1 · Fuvar</h2>
          <select value={tripId} onChange={(e) => setTripId(e.target.value)} className={`${field} cursor-pointer`}>
            {trips.map((x) => <option key={x.id} value={x.id}>{x.name} · {Math.round(x.summary.distanceKm)} km</option>)}
          </select>
          <input className={`${field} mt-3`} placeholder="Áru megnevezése (pl. 33 raklap, 24 t gépalkatrész)" value={cargo} onChange={(e) => setCargo(e.target.value)} />
        </section>

        <section className="border-2 border-black bg-white p-5">
          <h2 className="mb-3 text-[14px] font-black uppercase tracking-tight">2 · Megrendelő</h2>
          <input className={field} placeholder="Cégnév" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
          <input className={`${field} mt-2`} placeholder="Cím, adószám" value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} />
          <input className={`${field} mt-2`} placeholder="Kapcsolattartó" value={client.contact} onChange={(e) => setClient({ ...client, contact: e.target.value })} />
        </section>

        <section className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_#00ff9d]">
          <h2 className="mb-3 text-[14px] font-black uppercase tracking-tight">3 · Ár</h2>
          <div className="flex gap-1.5">
            <button className={seg(mode === "margin")} onClick={() => setMode("margin")}>Árrés %</button>
            <button className={seg(mode === "perKm")} onClick={() => setMode("perKm")}>€ / km</button>
            <button className={seg(mode === "fixed")} onClick={() => { setMode("fixed"); if (!fixed && calc) setFixed(Math.round(calc.freight)); }}>Fix ár</button>
          </div>
          {mode === "margin" && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between"><span className="label-xs">Haszonkulcs az önköltségre</span><span className="text-[22px] font-black tabular-nums" style={{ fontFamily: "var(--font-brand)" }}>{prefs.margin}%</span></div>
              <input type="range" min={0} max={60} step={1} value={prefs.margin} onChange={(e) => set("margin", Number(e.target.value))} className="mt-1 w-full accent-black" />
            </div>
          )}
          {mode === "perKm" && (
            <label className="mt-4 block"><span className="label-xs">Díj kilométerenként (EUR)</span>
              <input type="number" step={0.01} min={0} value={prefs.perKm} onChange={(e) => set("perKm", Number(e.target.value))} className={`${field} text-[20px] font-bold`} /></label>
          )}
          {mode === "fixed" && (
            <label className="mt-4 block"><span className="label-xs">Fuvardíj (EUR, nettó)</span>
              <input type="number" step={10} min={0} value={fixed} onChange={(e) => setFixed(Number(e.target.value))} className={`${field} text-[20px] font-bold`} /></label>
          )}

          {/* belső kalkuláció: nem kerül az ajánlatra */}
          {calc && (
            <dl className="mt-5 grid grid-cols-2 gap-px border-2 border-black bg-black text-center">
              {[
                ["Önköltség", m(calc.cost)],
                ["Haszon", m(calc.profit)],
                ["Árrés", `${calc.marginPct.toFixed(1).replace(".", ",")}%`],
                ["Ár / km", money(calc.perKm * k, prefs.cur)],
              ].map(([a, b]) => (
                <div key={a} className="bg-white px-2 py-3"><dd className={`text-[16px] font-black tabular-nums ${a === "Haszon" && calc.profit < 0 ? "text-rose-600" : "text-black"}`}>{b}</dd><dt className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-black/45">{a}</dt></div>
              ))}
            </dl>
          )}
          {calc && calc.profit < 0 && <p className="mt-2 text-[12.5px] font-semibold text-rose-600">Figyelem: az ár az önköltség alatt van.</p>}
          <p className="mt-2 text-[11.5px] text-black/45">Ez a doboz csak neked látszik, az ajánlatra nem kerül rá.</p>

          <div className="mt-5">
            <span className="label-xs">Extra tételek</span>
            <div className="space-y-2">
              {extras.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <input className={`${field} !py-1.5 !text-[14px]`} value={e.name} onChange={(ev) => setExtras((x) => x.map((y) => (y.id === e.id ? { ...y, name: ev.target.value } : y)))} />
                  <input type="number" className={`${field} !w-24 !py-1.5 text-right !text-[14px]`} value={e.eur} onChange={(ev) => setExtras((x) => x.map((y) => (y.id === e.id ? { ...y, eur: Number(ev.target.value) } : y)))} />
                  <span className="font-mono text-[11px] text-black/40">€</span>
                  <button onClick={() => setExtras((x) => x.filter((y) => y.id !== e.id))} className="text-black/35 hover:text-rose-600">✕</button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXTRAS.filter((n) => !extras.some((e) => e.name === n)).map((n) => (
                <button key={n} onClick={() => setExtras((x) => [...x, { id: uid(), name: n, eur: 50 }])} className="border border-black/15 px-2 py-1 text-[11.5px] font-semibold text-black/60 transition hover:border-black hover:text-black">+ {n}</button>
              ))}
              <button onClick={() => setExtras((x) => [...x, { id: uid(), name: "Egyéb tétel", eur: 0 }])} className="border border-black/15 px-2 py-1 text-[11.5px] font-semibold text-black/60 transition hover:border-black hover:text-black">+ Egyéb</button>
            </div>
          </div>
        </section>

        <section className="border-2 border-black bg-white p-5">
          <h2 className="mb-3 text-[14px] font-black uppercase tracking-tight">4 · Feltételek</h2>
          <span className="label-xs">ÁFA</span>
          <div className="flex gap-1.5">
            <button className={seg(prefs.vat === "rc")} onClick={() => set("vat", "rc")}>Ford. adózás</button>
            <button className={seg(prefs.vat === "27")} onClick={() => set("vat", "27")}>27%</button>
            <button className={seg(prefs.vat === "0")} onClick={() => set("vat", "0")}>Áfa nélkül</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div><span className="label-xs">Pénznem</span>
              <div className="flex gap-1.5"><button className={seg(prefs.cur === "EUR")} onClick={() => set("cur", "EUR")}>EUR</button><button className={seg(prefs.cur === "HUF")} onClick={() => set("cur", "HUF")}>HUF</button></div>
            </div>
            {prefs.cur === "HUF" ? (
              <label className="block"><span className="label-xs">Árfolyam (Ft/€)</span><input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value) || eurHuf)} className={field} /></label>
            ) : <span />}
            <label className="block"><span className="label-xs">Érvényes (nap)</span><input type="number" min={1} value={prefs.validDays} onChange={(e) => set("validDays", Number(e.target.value))} className={field} /></label>
            <label className="block"><span className="label-xs">Fizetés (nap)</span><input type="number" min={0} value={prefs.payDays} onChange={(e) => set("payDays", Number(e.target.value))} className={field} /></label>
            <label className="block"><span className="label-xs">Ajánlatszám</span><input value={number} onChange={(e) => setNumber(e.target.value)} className={field} /></label>
            <label className="block"><span className="label-xs">Kelt</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-[13px] font-semibold"><input type="checkbox" checked={prefs.tollLine} onChange={(e) => set("tollLine", e.target.checked)} className="h-4 w-4 accent-black" /> Útdíj külön soron</label>
          <label className="mt-4 block"><span className="label-xs">Megjegyzés</span>
            <textarea rows={4} value={prefs.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1 w-full resize-y border-2 border-black/15 bg-[#fafaf7] p-3 text-[13px] leading-relaxed outline-none focus:border-black" /></label>
        </section>

        <details className="border-2 border-black bg-white p-5">
          <summary className="cursor-pointer text-[14px] font-black uppercase tracking-tight">5 · Saját adataid az ajánlaton</summary>
          <div className="mt-3 space-y-2">
            {([["company", "Cégnév"], ["name", "Név"], ["email", "E-mail"], ["phone", "Telefon"]] as [keyof Me, string][]).map(([key, l]) => (
              <input key={key} className={field} placeholder={l} value={me[key] ?? ""} onChange={(e) => setMe(key, e.target.value)} />
            ))}
            <p className="text-[11.5px] text-black/45">Ebben a böngészőben megjegyezzük a következő ajánlathoz.</p>
          </div>
        </details>
      </div>

      {/* előnézet */}
      <div className="min-w-0">
        <div className="sticky top-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black/45">Előnézet · A4</span>
            <button onClick={() => printDoc(`Árajánlat ${number} – ${client.name || t?.name || ""}`)} className="btn-primary ml-auto">⎙ Nyomtatás / PDF</button>
          </div>
          <FitWidth width={794}>{doc}</FitWidth>
          <p className="text-[12px] text-black/45">PDF-hez a nyomtatási ablakban válaszd a „Mentés PDF-ként” célt.</p>
        </div>
      </div>
    </div>
  );
}

/** az A4-es lapot a rendelkezésre álló szélességre kicsinyíti (a nyomtatás mindig teljes méretű) */
function FitWidth({ width, children }: { width: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ k: 1, h: 0 });
  useEffect(() => {
    const el = box.current, inn = inner.current;
    if (!el || !inn) return;
    const ro = new ResizeObserver(() => {
      const k = Math.min(1, el.clientWidth / width);
      setFit({ k, h: inn.offsetHeight * k });
    });
    ro.observe(el); ro.observe(inn);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className="w-full overflow-hidden" style={{ height: fit.h || undefined }}>
      <div ref={inner} style={{ width, transform: `scale(${fit.k})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

interface Calc { cost: number; freight: number; extrasEur: number; net: number; profit: number; vat: number; gross: number; perKm: number }

function QuoteDoc({ t, calc, m, me, client, cargo, extras, number, date, prefs }: { t: QuoteTrip; calc: Calc; m: (n: number) => string; me: Me; client: { name: string; address: string; contact: string }; cargo: string; extras: Extra[]; number: string; date: string; prefs: Prefs }) {
  const toll = Math.min(calc.freight, t.summary.tollEur + (t.summary.ferryEur ?? 0));
  const rows: [string, string, number][] = prefs.tollLine
    ? [["Közúti fuvarozás", `${t.from} → ${t.to} · ${Math.round(t.summary.distanceKm)} km`, calc.freight - toll], ["Útdíjak és kompdíjak", `${t.summary.countries.length} ország`, toll]]
    : [["Közúti fuvarozás", `${t.from} → ${t.to} · ${Math.round(t.summary.distanceKm)} km, útdíjjal`, calc.freight]];
  for (const e of extras) if (e.name.trim()) rows.push([e.name, "", e.eur]);
  const vatLabel = prefs.vat === "27" ? "ÁFA 27%" : prefs.vat === "rc" ? "ÁFA – fordított adózás" : "ÁFA";
  const transit = Math.max(1, Math.ceil(t.summary.days || t.summary.drivingMin / 540));
  return (
    <article className="rr-doc w-[794px] max-w-none bg-white text-[12.5px] leading-relaxed text-black shadow-[0_20px_60px_rgba(0,0,0,0.12)]" style={{ fontFamily: "var(--font-driver), system-ui, sans-serif" }}>
      <header className="flex items-start justify-between gap-6 bg-[#050505] px-10 py-8 text-white">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#00ff9d]">Árajánlat</div>
          <div className="mt-2 text-[30px] font-black uppercase leading-none tracking-tight">{t.from} → {t.to}</div>
          <div className="mt-2 font-mono text-[11px] text-white/60">{number} · {huDate(date)}</div>
        </div>
        <div className="text-right">
          <div className="text-[16px] font-black">{me.company || me.name}</div>
          <div className="mt-1 text-[11.5px] leading-snug text-white/65">{me.company && me.name}<br />{me.email}{me.phone ? <><br />{me.phone}</> : null}</div>
        </div>
      </header>
      <div className="h-1.5 bg-[#00ff9d]" />

      <section className="grid grid-cols-2 gap-8 px-10 pt-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">Megrendelő</div>
          <div className="mt-1.5 text-[15px] font-black">{client.name || "—"}</div>
          {client.address && <div className="text-black/70">{client.address}</div>}
          {client.contact && <div className="text-black/70">{client.contact}</div>}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/45">Fuvar</div>
          <table className="mt-1.5 w-full"><tbody>
            {[
              ["Útvonal", `${t.from} → ${t.to}`],
              ["Távolság", `${Math.round(t.summary.distanceKm).toLocaleString("hu-HU")} km`],
              ["Menetidő", `kb. ${transit} nap`],
              ...(t.departure ? [["Tervezett indulás", dt(t.departure)]] : []),
              ...(cargo ? [["Áru", cargo]] : []),
              ["Jármű", `${t.weight ? `${t.weight.toLocaleString("hu-HU")} t` : "kamion"}${t.euro ? ` · ${t.euro.replace("euro", "EURO ").replace("older", "EURO 3-")}` : ""}${t.hazmat ? " · ADR" : ""}`],
            ].map(([a, b]) => <tr key={a}><td className="py-0.5 pr-3 text-black/50">{a}</td><td className="py-0.5 font-semibold">{b}</td></tr>)}
          </tbody></table>
        </div>
      </section>

      <section className="px-10 pt-5">
        <div className="flex flex-wrap gap-1.5">
          {t.summary.countries.map((c) => <span key={c} className="border border-black/15 px-1.5 py-0.5 text-[11px] font-semibold">{flag(c)} {COUNTRY_NAMES[c] ?? c}</span>)}
        </div>
      </section>

      <section className="px-10 pt-7">
        <table className="w-full border-collapse">
          <thead><tr className="border-b-2 border-black text-left text-[10px] font-bold uppercase tracking-[0.2em] text-black/55"><th className="pb-2">Tétel</th><th className="pb-2 text-right">Nettó</th></tr></thead>
          <tbody>
            {rows.map(([a, b, v], i) => (
              <tr key={i} className="border-b border-black/10"><td className="py-3"><div className="font-bold">{a}</div>{b && <div className="text-[11.5px] text-black/55">{b}</div>}</td><td className="py-3 text-right font-semibold tabular-nums">{m(v)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-4 w-[300px]">
          <div className="flex justify-between py-1"><span className="text-black/60">Nettó összesen</span><span className="font-bold tabular-nums">{m(calc.net)}</span></div>
          <div className="flex justify-between py-1"><span className="text-black/60">{vatLabel}</span><span className="font-bold tabular-nums">{m(calc.vat)}</span></div>
          <div className="mt-1 flex items-center justify-between bg-black px-3 py-2.5 text-white"><span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00ff9d]">Fizetendő</span><span className="text-[18px] font-black tabular-nums">{m(calc.gross)}</span></div>
          {prefs.vat === "rc" && <div className="mt-1.5 text-[10.5px] leading-snug text-black/50">Fordított adózás: az ÁFA-t a megrendelő fizeti.</div>}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-6 px-10 pt-8">
        {[["Érvényes", huDate(addDays(date, prefs.validDays))], ["Fizetési határidő", `${prefs.payDays} nap, átutalással`], ["Pénznem", prefs.cur]].map(([a, b]) => (
          <div key={a} className="border-t-2 border-black pt-2"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45">{a}</div><div className="mt-0.5 font-bold">{b}</div></div>
        ))}
      </section>
      {prefs.notes.trim() && <section className="px-10 pt-6"><p className="whitespace-pre-line text-[11.5px] leading-relaxed text-black/65">{prefs.notes}</p></section>}

      <footer className="mt-10 flex items-end justify-between gap-6 px-10 pb-10">
        <div>
          <div className="h-10 w-56 border-b border-black/40" />
          <div className="mt-1.5 text-[11px] font-bold">{me.name}</div>
          <div className="text-[10.5px] text-black/50">{me.company}</div>
        </div>
        <div className="text-right text-[10px] text-black/40">Az útvonal és a költségek a routeR kamion-útvonaltervezővel készültek.<br />route<b className="text-black">R</b> by tesotter</div>
      </footer>
    </article>
  );
}
