import data from "@/data/parkings.json";

/** [lat, lon, fajta(0 kamion, 1 pihenő, 2 szolgáltató), név, férőhely, díj, őrzött, üzemeltető, wc, diesel] */
type Row = [number, number, number, string, string, string, string, string, string, string];
const ROWS = data as unknown as Row[];
const KINDS = ["truck", "rest", "services"] as const;
const NAMES = ["Kamionparkoló", "Pihenőhely", "Szolgáltató terület"];

/** egyszerű rács-index (0,5°-os cellák): a körzetkeresés így mikroszekundumos */
const CELL = 0.5;
const grid = new Map<string, Row[]>();
for (const r of ROWS) {
  const k = `${Math.floor(r[0] / CELL)}:${Math.floor(r[1] / CELL)}`;
  (grid.get(k) ?? grid.set(k, []).get(k)!).push(r);
}

export const parkingCount = ROWS.length;

/** a dataset lefedi-e a pontot (van-e a közelében – ~100 km – bármilyen adat) */
export function hasCoverage(lat: number, lon: number): boolean {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (grid.get(`${Math.floor(lat / CELL) + dy}:${Math.floor(lon / CELL) + dx}`)?.length) return true;
  }
  return false;
}

export function parkingsNear(lat: number, lon: number, radiusKm: number) {
  const k = Math.cos((lat * Math.PI) / 180);
  const dLat = radiusKm / 110.57, dLon = radiusKm / (111.32 * k);
  const out: GeoJSON.Feature[] = [];
  for (let cy = Math.floor((lat - dLat) / CELL); cy <= Math.floor((lat + dLat) / CELL); cy++) {
    for (let cx = Math.floor((lon - dLon) / CELL); cx <= Math.floor((lon + dLon) / CELL); cx++) {
      for (const r of grid.get(`${cy}:${cx}`) ?? []) {
        const distKm = Math.hypot((r[1] - lon) * 111.32 * k, (r[0] - lat) * 110.57);
        if (distKm > radiusKm) continue;
        out.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [r[1], r[0]] },
          properties: {
            kind: KINDS[r[2]], distKm: Math.round(distKm * 10) / 10, name: r[3] || NAMES[r[2]],
            capacity: r[4] || null, fee: r[5] || null, supervised: r[6] || null, operator: r[7] || null, toilets: r[8] || null, fuel: r[9] || null,
          },
        });
      }
    }
  }
  return out.sort((a, b) => (a.properties!.distKm as number) - (b.properties!.distKm as number));
}
