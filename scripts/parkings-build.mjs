/**
 * Európai kamionparkoló / pihenőhely adatbázis építése az Overpass-csempékből.
 * Használat: node scripts/parkings-build.mjs <csempe-mappa>   (a mappában: <lat>_<lon>.json = Overpass `elements`)
 * Kimenet: src/data/parkings.json – tömbök: [lat, lon, fajta(0 kamion, 1 pihenő, 2 szolgáltató), név, férőhely, díj, őrzött, üzemeltető, wc, diesel]
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("Add meg a csempe-mappát."); process.exit(1); }
const seen = new Set();
const rows = [];
const r4 = (x) => Math.round(x * 1e4) / 1e4;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  for (const el of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
    const c = el.center ?? (el.lat !== undefined ? { lat: el.lat, lon: el.lon } : null);
    if (!c) continue;
    const t = el.tags ?? {};
    const kind = t.highway === "services" ? 2 : t.highway === "rest_area" || t.amenity === "rest_area" ? 1 : 0;
    const key = `${el.type}${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([r4(c.lat), r4(c.lon), kind, (t.name ?? "").slice(0, 80), t["capacity:hgv"] ?? "", t.fee ?? "", t.supervised ?? t.surveillance ?? "", (t.operator ?? "").slice(0, 60), t.toilets ?? "", t["fuel:diesel"] ?? ""]);
  }
}
fs.writeFileSync(new URL("../src/data/parkings.json", import.meta.url), JSON.stringify(rows));
console.log(rows.length, "pont");
