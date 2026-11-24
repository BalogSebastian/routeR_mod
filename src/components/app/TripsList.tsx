"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TripCard, { type TripListItem } from "./TripCard";

export default function TripsList({ initial }: { initial: TripListItem[] }) {
  const [trips, setTrips] = useState(initial);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [msg, setMsg] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = trips.filter((t) => (!onlyFav || t.favorite) && (!s || `${t.name} ${t.from} ${t.to} ${t.summary.roads.join(" ")}`.toLowerCase().includes(s)));
    // a kedvencek elöl, egyébként a megadott (frissítés szerinti) sorrend
    return [...list].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
  }, [trips, q, onlyFav]);

  const toggleFav = async (t: TripListItem) => {
    const favorite = !t.favorite;
    setTrips((x) => x.map((y) => (y.id === t.id ? { ...y, favorite } : y)));
    const res = await fetch(`/api/trips/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite }) });
    if (!res.ok) setTrips((x) => x.map((y) => (y.id === t.id ? { ...y, favorite: !favorite } : y)));
  };
  const duplicate = async (t: TripListItem) => {
    setBusy(t.id);
    setMsg("");
    const res = await fetch(`/api/trips/${t.id}/duplicate`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setTrips((x) => [{ ...t, id: j.id, name: j.name, favorite: false, updatedAt: new Date().toISOString() }, ...x]);
    else setMsg(j.error ?? "A duplikálás nem sikerült.");
    setBusy(null);
  };

  const rename = async (t: TripListItem) => {
    const name = window.prompt("Új név:", t.name)?.trim();
    if (!name || name === t.name) return;
    setBusy(t.id);
    const res = await fetch(`/api/trips/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) setTrips((x) => x.map((y) => (y.id === t.id ? { ...y, name } : y)));
    setBusy(null);
  };
  const remove = async (t: TripListItem) => {
    if (!window.confirm(`Törlöd a(z) „${t.name}” fuvart?`)) return;
    setBusy(t.id);
    const res = await fetch(`/api/trips/${t.id}`, { method: "DELETE" });
    if (res.ok) setTrips((x) => x.filter((y) => y.id !== t.id));
    setBusy(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input className="input-lg max-w-sm" placeholder="Keresés: név, város, útszám…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setOnlyFav((v) => !v)} className={`border-2 px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition ${onlyFav ? "border-black bg-black text-[#00ff9d]" : "border-black/20 bg-white text-black hover:border-black"}`}>★ Kedvencek</button>
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-black/45">{shown.length} fuvar</span>
        {msg && <span className="text-sm text-rose-600">{msg}</span>}
        <Link href="/planner" className="btn-primary ml-auto">+ Új útvonal</Link>
      </div>
      {shown.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((t) => (
            <div key={t.id} className={`relative ${busy === t.id ? "opacity-50" : ""}`}>
              <TripCard t={t} />
              <div className="mt-2 flex justify-end gap-4 px-1 font-mono text-[11px] font-bold uppercase tracking-wide">
                <button className={t.favorite ? "text-black" : "text-black/40 hover:text-black"} onClick={() => toggleFav(t)}>{t.favorite ? "★ Kedvenc" : "☆ Kedvenc"}</button>
                <button className="text-black/40 hover:text-black" onClick={() => duplicate(t)}>⧉ Duplikálás</button>
                <button className="text-black/40 hover:text-black" onClick={() => rename(t)}>Átnevezés</button>
                <button className="text-black/40 hover:text-rose-600" onClick={() => remove(t)}>Törlés</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="border-2 border-dashed border-black/25 bg-white p-12 text-center text-sm text-black/55">{trips.length ? (onlyFav ? "Még nincs kedvenc fuvarod – jelölj meg egyet a ☆ gombbal." : "Nincs találat.") : "Még nincs mentett fuvarod."}</p>
      )}
    </div>
  );
}
