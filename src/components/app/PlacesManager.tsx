"use client";

import { useEffect, useMemo, useState } from "react";
import { norm, PLACE_KINDS, placeIcon, plannerUrl, type PlaceItem, type PlaceKind } from "@/lib/app-data";
import { flag } from "@/lib/format";
import GeoSearch, { type GeoHit } from "./GeoSearch";
import MiniMap from "./MiniMap";

type Draft = Omit<PlaceItem, "id" | "uses" | "updatedAt" | "lastUsedAt"> & { id?: string };
const empty = (): Draft => ({ name: "", kind: "customer", label: "", lat: 0, lon: 0 });

export default function PlacesManager({ initial }: { initial: PlaceItem[] }) {
  const [places, setPlaces] = useState(initial);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<PlaceKind | "all">("all");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [route, setRoute] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const shown = useMemo(() => {
    const s = norm(q.trim());
    return places.filter((p) => (kind === "all" || p.kind === kind) && (!s || norm(`${p.name} ${p.label} ${p.notes ?? ""} ${p.contact ?? ""}`).includes(s)));
  }, [places, q, kind]);
  const counts = useMemo(() => Object.fromEntries(PLACE_KINDS.map((k) => [k.k, places.filter((p) => p.kind === k.k).length])), [places]);

  const save = async (d: Draft) => {
    const body = JSON.stringify({ name: d.name, kind: d.kind, label: d.label, lat: d.lat, lon: d.lon, cc: d.cc, hours: d.hours || undefined, contact: d.contact || undefined, phone: d.phone || undefined, notes: d.notes || undefined });
    const r = await fetch(d.id ? `/api/places/${d.id}` : "/api/places", { method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body });
    const j = (await r.json().catch(() => ({}))) as { place?: PlaceItem; error?: string };
    if (!r.ok || !j.place) return j.error ?? "A mentés nem sikerült.";
    setPlaces((x) => (d.id ? x.map((p) => (p.id === d.id ? j.place! : p)) : [j.place!, ...x]));
    setEdit(null);
    return null;
  };
  const remove = async (p: PlaceItem) => {
    if (!window.confirm(`Törlöd a(z) „${p.name}” helyet?`)) return;
    const r = await fetch(`/api/places/${p.id}`, { method: "DELETE" });
    if (r.ok) { setPlaces((x) => x.filter((y) => y.id !== p.id)); setRoute((x) => x.filter((id) => id !== p.id)); }
  };
  const toggleRoute = (id: string) => setRoute((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id].slice(0, 12)));
  const go = (ids: string[]) => {
    const w = ids.map((id) => places.find((p) => p.id === id)!).filter(Boolean).map((p) => ({ lat: p.lat, lon: p.lon, label: `${p.name} — ${p.label}` }));
    window.location.href = plannerUrl(w);
  };
  const copy = async (p: PlaceItem) => {
    const text = `${p.name}\n${p.label}\n${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}\nhttps://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}${p.hours ? `\nNyitvatartás: ${p.hours}` : ""}${p.contact || p.phone ? `\nKapcsolat: ${[p.contact, p.phone].filter(Boolean).join(", ")}` : ""}${p.notes ? `\n${p.notes}` : ""}`;
    try { await navigator.clipboard.writeText(text); } catch { window.prompt("Másold ki:", text); }
    setCopied(p.id); setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input className="input-lg max-w-xs" placeholder="Keresés: név, cím, megjegyzés…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setEdit(empty())} className="btn-primary ml-auto">+ Új hely</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setKind("all")} className={`border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition ${kind === "all" ? "border-black bg-black text-[#00ff9d]" : "border-black/15 bg-white text-black hover:border-black"}`}>Mind · {places.length}</button>
        {PLACE_KINDS.filter((k) => counts[k.k]).map((k) => (
          <button key={k.k} onClick={() => setKind(k.k)} className={`border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition ${kind === k.k ? "border-black bg-black text-[#00ff9d]" : "border-black/15 bg-white text-black hover:border-black"}`}>{k.icon} {k.l} · {counts[k.k]}</button>
        ))}
      </div>

      {/* több hely kijelölése → útvonal a tervezőben */}
      {route.length > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 border-2 border-black bg-[#050505] p-3 text-white shadow-[6px_6px_0_0_#00ff9d] md:top-4">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#00ff9d]">Útvonal</span>
          <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[13px] font-bold">
            {route.map((id, i) => { const p = places.find((x) => x.id === id); return p ? <li key={id} className="flex items-center gap-1.5">{i > 0 && <span className="text-[#00ff9d]">→</span>}<span className="bg-white/10 px-2 py-0.5">{String.fromCharCode(65 + i)} · {p.name}</span></li> : null; })}
          </ol>
          <button onClick={() => setRoute([])} className="font-mono text-[11px] font-bold uppercase text-white/50 hover:text-white">Törlés</button>
          <button disabled={route.length < 2} onClick={() => go(route)} className="bg-[#00ff9d] px-4 py-2 text-[11.5px] font-extrabold uppercase tracking-[0.15em] text-black disabled:opacity-40">Tervezés →</button>
        </div>
      )}

      {shown.length ? (
        <div className="rr-stack grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const inRoute = route.indexOf(p.id);
            return (
              <article key={p.id} className={`group relative flex flex-col border-2 border-black bg-white transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 ${inRoute >= 0 ? "shadow-[6px_6px_0_0_#00ff9d]" : "hover:shadow-[6px_6px_0_0_#000]"}`}>
                <div className="relative">
                  <MiniMap lat={p.lat} lon={p.lon} className="h-36 w-full border-b-2 border-black" label={p.name} />
                  <span className="absolute left-3 top-3 bg-black px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#00ff9d]">{placeIcon(p.kind)} {PLACE_KINDS.find((k) => k.k === p.kind)?.l}</span>
                  <button onClick={() => toggleRoute(p.id)} title="Útvonalhoz adás" className={`absolute right-3 top-3 flex h-8 min-w-8 items-center justify-center px-2 font-mono text-[12px] font-black transition ${inRoute >= 0 ? "bg-[#00ff9d] text-black" : "bg-white/90 text-black hover:bg-[#00ff9d]"}`}>
                    {inRoute >= 0 ? String.fromCharCode(65 + inRoute) : "+"}
                  </button>
                  {p.uses > 0 && <span className="absolute bottom-2 right-3 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black/60">{p.uses}× használva</span>}
                </div>
                <div className="flex-1 p-4">
                  <h3 className="text-[17px] font-black uppercase leading-tight tracking-tight text-black" style={{ fontFamily: "var(--font-brand)" }}>{p.name}</h3>
                  <p className="mt-1 text-[12.5px] leading-snug text-black/55">{p.cc ? `${flag(p.cc)} ` : ""}{p.label}</p>
                  {(p.hours || p.contact || p.phone || p.notes) && (
                    <dl className="mt-3 space-y-1.5 border-t border-black/10 pt-3 text-[12.5px]">
                      {p.hours && <div className="flex gap-2"><dt className="w-4 shrink-0">🕒</dt><dd className="font-semibold text-black">{p.hours}</dd></div>}
                      {(p.contact || p.phone) && <div className="flex gap-2"><dt className="w-4 shrink-0">👤</dt><dd className="text-black">{p.contact}{p.contact && p.phone ? " · " : ""}{p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="font-semibold underline">{p.phone}</a>}</dd></div>}
                      {p.notes && <div className="flex gap-2"><dt className="w-4 shrink-0">📝</dt><dd className="whitespace-pre-line text-black/70">{p.notes}</dd></div>}
                    </dl>
                  )}
                </div>
                <div className="flex items-stretch border-t-2 border-black font-mono text-[11px] font-bold uppercase tracking-wide">
                  <button onClick={() => go([p.id])} className="flex flex-1 items-center justify-center gap-1.5 bg-black py-3 text-white transition hover:bg-[#00ff9d] hover:text-black">Útvonal innen →</button>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`} target="_blank" rel="noreferrer" title="Navigáció (Google Maps)" className="flex items-center border-l-2 border-black px-3 transition hover:bg-[#00ff9d]">🧭</a>
                  <button onClick={() => copy(p)} title="Adatok másolása (sofőrnek)" className="border-l-2 border-black px-3 transition hover:bg-[#00ff9d]">{copied === p.id ? "✓" : "⧉"}</button>
                  <button onClick={() => setEdit({ ...p })} title="Szerkesztés" className="border-l-2 border-black px-3 transition hover:bg-[#00ff9d]">✎</button>
                  <button onClick={() => remove(p)} title="Törlés" className="border-l-2 border-black px-3 transition hover:bg-rose-500 hover:text-white">✕</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-dashed border-black/30 bg-white p-10 text-center md:p-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#00ff9d] text-3xl shadow-[5px_5px_0_0_#000]">📍</div>
          <p className="mt-6 text-[20px] font-black uppercase tracking-tight text-black" style={{ fontFamily: "var(--font-brand)" }}>{places.length ? "Nincs találat" : "Még nincs mentett helyed"}</p>
          {!places.length && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-black/55">Vedd fel a telephelyet, a visszatérő ügyfeleket és rakodóhelyeket. A tervezőben a név első betűinél már ajánlja, a sofőrnek pedig egy gombnyomással átküldheted a nyitvatartást és a kapcsolattartót.</p>}
          {!places.length && <button onClick={() => setEdit(empty())} className="btn-primary mt-7">+ Első hely felvétele</button>}
        </div>
      )}

      {edit && <PlaceEditor draft={edit} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}

function PlaceEditor({ draft, onClose, onSave }: { draft: Draft; onClose: () => void; onSave: (d: Draft) => Promise<string | null> }) {
  const [d, setD] = useState<Draft>(draft);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const geo: GeoHit | null = d.label ? { label: d.label, lat: d.lat, lon: d.lon, cc: d.cc } : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((o) => ({ ...o, [k]: v }));
  const submit = async () => {
    if (!d.name.trim()) return setErr("Adj nevet a helynek.");
    if (!d.label) return setErr("Válaszd ki a címet a listából.");
    setBusy(true); setErr("");
    const e = await onSave({ ...d, name: d.name.trim() });
    setBusy(false);
    if (e) setErr(e);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal aria-label="Hely szerkesztése">
      <div className="rr-up flex max-h-[94dvh] w-full max-w-2xl flex-col border-2 border-black bg-white shadow-[10px_10px_0_0_#00ff9d]" style={{ animationDuration: "0.35s" }}>
        <div className="relative shrink-0">
          {geo ? <MiniMap lat={geo.lat} lon={geo.lon} zoom={14} className="h-40 w-full border-b-2 border-black" /> : <div className="h-40 w-full border-b-2 border-black bg-[#050505] [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:24px_24px]" />}
          <div className="absolute left-4 top-4 bg-black px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.25em] text-[#00ff9d]">{d.id ? "Szerkesztés" : "Új hely"}</div>
          <button onClick={onClose} aria-label="Bezárás" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center bg-white text-[20px] leading-none text-black">×</button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-7">
          <label className="block"><span className="label-xs">Cím</span><GeoSearch value={geo} autoFocus={!d.id} onPick={(h) => setD((o) => (h ? { ...o, label: h.label, lat: h.lat, lon: h.lon, cc: h.cc?.toUpperCase(), name: o.name || h.label.split(/[—,]/)[0].trim() } : { ...o, label: "", lat: 0, lon: 0 }))} /></label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block"><span className="label-xs">Név</span><input className="input-lg" value={d.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="pl. Bosch Hatvan – 3. kapu" /></label>
            <div><span className="label-xs">Típus</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PLACE_KINDS.map((k) => (
                  <button type="button" key={k.k} onClick={() => set("kind", k.k)} className={`border-2 px-2.5 py-1.5 text-[12px] font-bold transition ${d.kind === k.k ? "border-black bg-black text-[#00ff9d]" : "border-black/15 text-black/65 hover:border-black"}`}>{k.icon} {k.l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block"><span className="label-xs">Nyitvatartás / rakodási idő</span><input className="input-lg !text-[15px]" value={d.hours ?? ""} maxLength={120} onChange={(e) => set("hours", e.target.value)} placeholder="H–P 6–14" /></label>
            <label className="block"><span className="label-xs">Kapcsolattartó</span><input className="input-lg !text-[15px]" value={d.contact ?? ""} maxLength={120} onChange={(e) => set("contact", e.target.value)} placeholder="Kiss Anna, raktár" /></label>
            <label className="block"><span className="label-xs">Telefon</span><input className="input-lg !text-[15px]" type="tel" value={d.phone ?? ""} maxLength={40} onChange={(e) => set("phone", e.target.value)} placeholder="+36 30 123 4567" /></label>
          </div>
          <label className="block"><span className="label-xs">Megjegyzés a sofőrnek</span>
            <textarea className="mt-1 w-full resize-y border-2 border-black/15 bg-[#fafaf7] p-3 text-[14px] leading-relaxed outline-none focus:border-black" rows={3} maxLength={1000} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="pl. Behajtás a 3-as kapun, rámpa 4–6, szállítólevél a portán. Csak előre egyeztetett idősávban." />
          </label>
          {err && <p className="text-[13px] font-semibold text-rose-600">{err}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 border-t-2 border-black px-5 py-4 md:px-7">
          <button onClick={onClose} className="px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.15em] text-black/55 hover:text-black">Mégse</button>
          <button disabled={busy} onClick={submit} className="btn-primary">{busy ? "Mentés…" : d.id ? "Mentés" : "Hozzáadás"}</button>
        </div>
      </div>
    </div>
  );
}
