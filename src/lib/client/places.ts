"use client";

import { norm, type PlaceItem } from "@/lib/app-data";

/** a Helyeim egyszer töltődik le oldalanként (a tervező minden mezője ugyanazt használja) */
let cache: Promise<PlaceItem[]> | null = null;
const listeners = new Set<() => void>();

export function loadPlaces(force = false): Promise<PlaceItem[]> {
  if (!cache || force) {
    cache = fetch("/api/places", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { places: [] }))
      .then((j: { places?: PlaceItem[] }) => j.places ?? [])
      .catch(() => []);
  }
  return cache;
}

export function onPlacesChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function savePlace(p: Omit<PlaceItem, "id" | "uses" | "updatedAt">): Promise<PlaceItem | null> {
  const r = await fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).catch(() => null);
  if (!r?.ok) return null;
  const j = (await r.json()) as { place: PlaceItem };
  await loadPlaces(true);
  listeners.forEach((f) => f());
  return j.place;
}

export function markUsed(id: string) {
  void fetch(`/api/places/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ used: true }) }).catch(() => {});
}

export function matchPlaces(list: PlaceItem[], q: string, max = 4): PlaceItem[] {
  const s = norm(q.trim());
  if (!s) return list.slice(0, 6);
  return list
    .map((p) => {
      const n = norm(p.name), l = norm(p.label), o = norm(`${p.notes ?? ""} ${p.contact ?? ""}`);
      const score = n.startsWith(s) ? 3 : n.includes(s) ? 2 : l.includes(s) ? 1.5 : o.includes(s) ? 1 : 0;
      return { p, score: score ? score + Math.min(1, p.uses / 20) : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.p);
}

/** a cím és a mentett hely egyezése (kb. 30 m-en belül) */
export const samePoint = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => Math.abs(a.lat - b.lat) < 0.0003 && Math.abs(a.lon - b.lon) < 0.0004;
