import type { LngLat, Waypoint } from "./types";
import { hav } from "./zones";

/**
 * Hosszú fuvarok darabolása. A routing-szerver kérésenként legfeljebb 1500 km (a pontok közti
 * légvonal összege) hosszú útvonalat tervez, ezért a hosszabb fuvart ~1100 km-es darabokban kérjük le.
 * A vágópontokat egy könnyű autós nyomvonal mentén választjuk (így nem eshetnek tengerbe, hegyre),
 * és a szerver csak autópályára / gyorsútra illesztheti őket, menetiránnyal – így nincs kitérő.
 */
export const SERVER_LIMIT_KM = 1350;
const STEP_KM = 1100;
const OSRM = process.env.COARSE_ROUTER_URL ?? "https://router.project-osrm.org";

const ll = (w: Waypoint): LngLat => [w.lon, w.lat];
export const crowSum = (wps: Waypoint[]) => wps.slice(1).reduce((s, w, i) => s + hav(ll(wps[i]), ll(w)), 0);

function bearing(a: LngLat, b: LngLat): number {
  const r = Math.PI / 180;
  const y = Math.sin((b[0] - a[0]) * r) * Math.cos(b[1] * r);
  const x = Math.cos(a[1] * r) * Math.sin(b[1] * r) - Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos((b[0] - a[0]) * r);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

async function coarsePath(wps: Waypoint[]): Promise<LngLat[] | null> {
  const pts = wps.map((w) => `${w.lon.toFixed(5)},${w.lat.toFixed(5)}`).join(";");
  try {
    const res = await fetch(`${OSRM}/route/v1/driving/${pts}?overview=full&geometries=geojson&steps=false`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { code: string; routes?: { geometry: { coordinates: LngLat[] } }[] };
    const c = j.code === "Ok" ? j.routes?.[0]?.geometry.coordinates : undefined;
    return c && c.length > 1 ? c : null;
  } catch {
    return null;
  }
}

/** a pontsor darabokra bontva (a darabok határán a pont mindkét darabban szerepel) */
export async function chunkLong(wps: Waypoint[]): Promise<Waypoint[][]> {
  if (wps.length < 2 || crowSum(wps) <= SERVER_LIMIT_KM) return [wps];
  const path = await coarsePath(wps);
  if (!path) return [wps];
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + hav(path[i - 1], path[i]));
  // a felhasználói pontok helye a nyomvonalon (előre haladva)
  const idx: number[] = [];
  let from = 0;
  for (const w of wps) {
    let best = from;
    let bd = Infinity;
    for (let i = from; i < path.length; i++) {
      const d = (path[i][0] - w.lon) ** 2 + (path[i][1] - w.lat) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    idx.push(best);
    from = best;
  }
  const cutAt = (km: number): Waypoint => {
    let i = cum.findIndex((c) => c >= km);
    if (i < 1) i = 1;
    if (i >= path.length - 1) i = path.length - 2;
    return { lat: path[i][1], lon: path[i][0], label: "", split: bearing(path[i], path[i + 1]) };
  };
  const chunks: Waypoint[][] = [];
  let cur: Waypoint[] = [wps[0]];
  let startKm = 0;
  let lastBreak = 0; // a darab utolsó nem-via pontja (ott is vághatunk)
  for (let k = 1; k < wps.length; k++) {
    const at = cum[idx[k]];
    if (at - startKm > STEP_KM && lastBreak > 0 && cur.length > 1 && !wps[lastBreak].via && cum[idx[lastBreak]] > startKm) {
      // inkább a felhasználó saját megállójánál vágunk
      const keep = cur.indexOf(wps[lastBreak]);
      if (keep > 0) {
        chunks.push(cur.slice(0, keep + 1));
        cur = cur.slice(keep);
        startKm = cum[idx[lastBreak]];
      }
    }
    while (at - startKm > STEP_KM) {
      const p = cutAt(startKm + STEP_KM);
      cur.push(p);
      chunks.push(cur);
      cur = [p];
      startKm += STEP_KM;
    }
    cur.push(wps[k]);
    if (!wps[k].via) lastBreak = k;
  }
  if (cur.length > 1) chunks.push(cur);
  return chunks;
}
