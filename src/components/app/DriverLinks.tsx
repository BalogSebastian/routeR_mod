"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CHANNEL_LABEL, type DriverLinkItem } from "@/lib/app-data";
import { dt, km } from "@/lib/format";

/** „most”, „5 perce”, „3 órája”, „tegnap 14:32”, „nov. 12. 09:10” */
function ago(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "most";
  if (s < 3600) return `${Math.floor(s / 60)} perce`;
  if (s < 6 * 3600) return `${Math.floor(s / 3600)} órája`;
  const d = new Date(t);
  const hm = d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (t >= today.getTime()) return `ma ${hm}`;
  if (t >= today.getTime() - 86400_000) return `tegnap ${hm}`;
  return `${d.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} ${hm}`;
}

type Filter = "all" | "opened" | "waiting";

export default function DriverLinks({ initial }: { initial: DriverLinkItem[] }) {
  const [links, setLinks] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());

  // élő frissítés: ha a sofőr közben megnyitja, felvillan a sor
  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    setNow(Date.now());
    const r = await fetch("/api/driver-links", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const j = (await r.json().catch(() => null)) as { links?: DriverLinkItem[] } | null;
    if (!j?.links) return;
    setLinks((prev) => {
      const before = new Map(prev.map((l) => [l.id, l.opens]));
      const changed = j.links!.filter((l) => (before.get(l.id) ?? 0) < l.opens).map((l) => l.id);
      if (changed.length) { setFlash(new Set(changed)); setTimeout(() => setFlash(new Set()), 2600); window.dispatchEvent(new Event("routeR:refresh")); }
      return j.links!;
    });
  }, []);
  useEffect(() => {
    const id = window.setInterval(refresh, 20_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [refresh]);

  const stats = useMemo(() => {
    const opened = links.filter((l) => l.opens > 0).length;
    return { sent: links.length, opened, waiting: links.length - opened, rate: links.length ? Math.round((opened / links.length) * 100) : 0 };
  }, [links]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return links.filter((l) => (filter === "all" || (filter === "opened" ? l.opens > 0 : l.opens === 0)) && (!s || `${l.tripName} ${l.driver ?? ""}`.toLowerCase().includes(s)));
  }, [links, filter, q]);

  const url = (l: DriverLinkItem) => `${window.location.origin}/sofor#d=${l.d}&l=${l.id}`;
  const copy = async (l: DriverLinkItem) => {
    try { await navigator.clipboard.writeText(url(l)); } catch { window.prompt("Másold ki a linket:", url(l)); }
    setCopied(l.id); setTimeout(() => setCopied(null), 1800);
  };
  const rename = async (l: DriverLinkItem) => {
    const driver = window.prompt("Kinek küldted? (sofőr neve vagy rendszám)", l.driver ?? "");
    if (driver === null) return;
    const r = await fetch(`/api/driver-links/${l.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driver: driver.trim() }) });
    if (r.ok) setLinks((x) => x.map((y) => (y.id === l.id ? { ...y, driver: driver.trim() } : y)));
  };
  const remove = async (l: DriverLinkItem) => {
    if (!window.confirm("Törlöd a listából? A sofőrnél a link továbbra is működik, csak nem követjük.")) return;
    const r = await fetch(`/api/driver-links/${l.id}`, { method: "DELETE" });
    if (r.ok) setLinks((x) => x.filter((y) => y.id !== l.id));
  };
  const resend = (l: DriverLinkItem) => {
    const text = `🚛 ${l.tripName}${l.dep ? `\nIndulás: ${dt(l.dep)}` : ""}\nRészletek, navigáció: ${url(l)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const tiles = [
    { k: "Elküldve", v: stats.sent, c: "text-black" },
    { k: "Megnyitva", v: stats.opened, c: "text-black" },
    { k: "Még nem nyitották meg", v: stats.waiting, c: stats.waiting ? "text-rose-600" : "text-black" },
    { k: "Megnyitási arány", v: `${stats.rate}%`, c: "text-black" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 border-2 border-black bg-white lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div key={t.k} className={`rr-up p-5 ${i % 2 === 0 ? "border-r-2 border-black" : ""} ${i < 2 ? "border-b-2 border-black lg:border-b-0" : ""} lg:border-r-2 lg:last:border-r-0`} style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
            <div className={`text-[clamp(1.6rem,3vw,2.3rem)] font-black leading-none tracking-tighter tabular-nums ${t.c}`} style={{ fontFamily: "var(--font-brand)" }}>{t.v}</div>
            <div className="mt-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-black/50">{t.k}</div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <input className="input-lg max-w-xs" placeholder="Keresés: útvonal, sofőr…" value={q} onChange={(e) => setQ(e.target.value)} />
        {([["all", "Mind"], ["opened", "Megnyitva"], ["waiting", "Nem nyitotta meg"]] as [Filter, string][]).map(([f, l]) => (
          <button key={f} onClick={() => setFilter(f)} className={`border-2 px-3.5 py-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] transition ${filter === f ? "border-black bg-black text-[#00ff9d]" : "border-black/20 bg-white text-black hover:border-black"}`}>{l}</button>
        ))}
        <span className="ml-auto flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.15em] text-black/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00c97b]" /> élő
        </span>
      </div>

      {shown.length ? (
        <ul className="rr-stack divide-y-2 divide-black border-2 border-black bg-white">
          {shown.map((l) => {
            const opened = l.opens > 0;
            return (
              <li key={l.id} className={`relative grid gap-4 p-4 transition-colors duration-700 md:grid-cols-[210px_1fr_auto] md:items-center md:p-5 ${flash.has(l.id) ? "bg-[#00ff9d]/25" : ""}`}>
                {/* állapot */}
                <div className="flex items-center gap-3">
                  <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center ${opened ? "bg-[#00ff9d] text-black" : "border-2 border-dashed border-black/25 text-black/35"}`}>
                    {opened ? (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    )}
                    {opened && flash.has(l.id) && <span aria-hidden className="absolute inset-0 animate-ping bg-[#00ff9d]" />}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-[12px] font-black uppercase tracking-[0.06em] ${opened ? "text-black" : "text-black/45"}`}>{opened ? "Megnyitva" : "Nem nyitotta meg"}</div>
                    <div className="font-mono text-[11px] text-black/50">
                      {opened ? `${ago(l.lastOpenedAt!, now)}${l.opens > 1 ? ` · ${l.opens}×` : ""}` : `elküldve ${ago(l.sentAt, now)}`}
                    </div>
                  </div>
                </div>
                {/* fuvar */}
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-black uppercase tracking-tight text-black" style={{ fontFamily: "var(--font-brand)" }}>
                    {l.from || l.tripName} <span className="text-[#00b874]">→</span> {l.to}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-black/55">
                    <button onClick={() => rename(l)} className="group inline-flex items-center gap-1 font-semibold text-black hover:underline" title="Kinek küldted?">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
                      {l.driver || <span className="font-normal text-black/40 group-hover:text-black">+ sofőr neve</span>}
                    </button>
                    <span>{km(l.km)}</span>
                    {l.dep && <span>indulás {dt(l.dep)}</span>}
                    {l.channel && <span className="bg-black/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-black/60">{CHANNEL_LABEL[l.channel] ?? l.channel}</span>}
                    {opened && l.firstOpenedAt && <span className="font-mono text-[11px] text-black/40">először: {ago(l.firstOpenedAt, now)}</span>}
                  </div>
                </div>
                {/* műveletek */}
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wide">
                  <button onClick={() => copy(l)} className="border-2 border-black px-3 py-2 uppercase transition hover:bg-[#00ff9d]">{copied === l.id ? "✓ Másolva" : "Link másolása"}</button>
                  <button onClick={() => resend(l)} className="border-2 border-black px-3 py-2 uppercase transition hover:bg-[#25d366] hover:text-white">WhatsApp</button>
                  <a href={`/sofor#d=${l.d}&l=${l.id}`} target="_blank" rel="noreferrer" title="Megnyitás (a saját megnyitásod nem számít)" className="border-2 border-black px-3 py-2 transition hover:bg-black hover:text-white">👁</a>
                  <button onClick={() => remove(l)} title="Törlés a listából" className="px-2 py-2 text-black/35 transition hover:text-rose-600">✕</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="relative overflow-hidden border-2 border-dashed border-black/30 bg-white p-10 text-center md:p-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#00ff9d] shadow-[5px_5px_0_0_#000]">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </div>
          <p className="mt-6 text-[20px] font-black uppercase tracking-tight text-black" style={{ fontFamily: "var(--font-brand)" }}>{links.length ? "Nincs találat" : "Még nem küldtél útvonalat"}</p>
          {!links.length && (
            <>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-black/55">Tervezz egy fuvart, és a „Sofőrnek küldés” résznél küldd el WhatsAppon, Viberen, e-mailben vagy SMS-ben. Itt látni fogod, mikor nyitotta meg a sofőr.</p>
              <Link href="/planner" className="btn-primary mt-7">Útvonal tervezése</Link>
            </>
          )}
        </div>
      )}
      <p className="text-[12px] leading-relaxed text-black/45">Csak azt rögzítjük, hogy és mikor nyitották meg a linket: IP-címet, eszközt vagy helyadatot nem. A listában lévő linkek 180 nap után automatikusan törlődnek.</p>
    </div>
  );
}
