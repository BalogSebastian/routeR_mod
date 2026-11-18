import fs from "node:fs";
const OUT = "/private/tmp/claude-501/-Users-balogsebastian-Downloads-tesotter-project-utvonal/0d917e91-e532-4aec-bb6b-176c7a4ee334/scratchpad/tiles";
const EPS = ["https://overpass-api.de/api/interpreter", "https://z.overpass-api.de/api/interpreter"];
const tiles = [];
for (let la = 41; la < 57; la += 2) for (let lo = -5; lo < 29; lo += 2) tiles.push([la, lo]);
const d = ([la, lo]) => Math.hypot(la + 1 - 47, (lo + 1 - 19) * 0.7);
tiles.sort((a, b) => d(a) - d(b));
const q = (s, w, n, e) => `[out:json][timeout:150];(nwr["amenity"="parking"]["hgv"~"^(yes|designated)$"](${s},${w},${n},${e});nwr["amenity"="parking"]["capacity:hgv"](${s},${w},${n},${e});nwr["amenity"="parking"]["parking"="truck"](${s},${w},${n},${e});nwr["highway"="rest_area"]["hgv"!="no"](${s},${w},${n},${e});nwr["amenity"="rest_area"](${s},${w},${n},${e});nwr["highway"="services"](${s},${w},${n},${e}););out tags center;`;
let idx = 0, done = 0;
async function worker(id) {
  while (idx < tiles.length) {
    const [la, lo] = tiles[idx++];
    const f = `${OUT}/${la}_${lo}.json`;
    if (fs.existsSync(f)) { done++; continue; }
    for (let t = 0; t < 6; t++) {
      const ep = EPS[(id + t) % EPS.length];
      try {
        const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q(la, lo, la + 2, lo + 2)), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "tesotter-truck-planner/1.0", Accept: "application/json" }, signal: AbortSignal.timeout(170000) });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        if (j.remark && /error|timed out|rejected/i.test(j.remark)) throw new Error(j.remark);
        fs.writeFileSync(f, JSON.stringify(j.elements));
        done++;
        console.log(`ok ${la},${lo} n=${j.elements.length} (${done}/${tiles.length})`);
        break;
      } catch (e) {
        console.log(`retry ${la},${lo} #${t}: ${e.message}`);
        await new Promise((r) => setTimeout(r, 4000 * (t + 1)));
      }
    }
  }
}
await Promise.all([worker(0), worker(1)]);
console.log("FINISHED", done, "/", tiles.length);
