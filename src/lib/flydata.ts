import type { LngLat, RouteResult } from "./types";

/** Az útvonal-lejátszáshoz szükséges, tömör adatok (a tervezőből és a sofőr-linkből is ez épül). */
export type FlySection = [label: string, cc: string, f0: number, f1: number, hours: number, kmh: number, tollEur: number, cls: string];
export type FlyStop = [f: number, kind: string, durH: number, atH: number, km: number, time: string, place: string, cc: string];

export interface FlyData {
  title: string;
  dep: string;
  km: number;
  driveMin: number;
  arr: string;
  days: number;
  geometry: LngLat[];
  sections: FlySection[];
  stops: FlyStop[];
}

const r = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** tömör szakasz- és megálló-lista (a sofőr-linkbe kerül) */
export function compactFly(route: RouteResult): { fs: FlySection[]; fst: FlyStop[] } {
  const fs = (route.sections ?? []).map((s): FlySection => [(s.label ?? "").slice(0, 14), s.country, r(s.f0, 4), r(s.f1, 4), r(s.h, 3), Math.round(s.speed), r(s.tollEur, 2), s.cls]);
  const fst = route.stops
    .filter((s) => (s.durH ?? 0) > 0)
    .map((s): FlyStop => [r(s.f, 4), s.kind, r(s.durH ?? 0, 2), r(s.atH, 2), Math.round(s.km), s.time, (s.place ?? "").slice(0, 40), s.country]);
  return { fs, fst };
}

export function flyFromRoute(route: RouteResult, title: string, departure: string, geometry?: LngLat[]): FlyData {
  const { fs, fst } = compactFly(route);
  return {
    title, dep: departure, km: Math.round(route.roadKm), driveMin: Math.round(route.drivingMin), arr: route.schedule.arrival, days: route.schedule.days,
    geometry: geometry ?? route.geometry, sections: fs, stops: fst,
  };
}

/** a kb. egyenletes szakaszolás: a vezetési órák az útvonal mentén (normalizálva a teljes vezetési időre) */
export function makeHoursAt(d: FlyData): (f: number) => number {
  const total = d.driveMin / 60;
  const sum = d.sections.reduce((a, s) => a + s[4], 0);
  if (!d.sections.length || sum <= 0) return (f) => f * total;
  const k = total / sum;
  return (f) => {
    let h = 0;
    for (const s of d.sections) {
      if (f >= s[3]) h += s[4];
      else { if (f > s[2]) h += s[4] * ((f - s[2]) / Math.max(1e-9, s[3] - s[2])); break; }
    }
    return h * k;
  };
}

/** az ország-szakaszok (zászlók az idővonalhoz): [cc, f0, f1] */
export function countryRuns(d: FlyData): [string, number, number][] {
  const out: [string, number, number][] = [];
  for (const s of d.sections) {
    const last = out[out.length - 1];
    if (last && last[0] === s[1]) last[2] = s[3];
    else out.push([s[1], s[2], s[3]]);
  }
  return out;
}
