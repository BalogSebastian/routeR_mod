import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import type { NextRequest } from "next/server";

/**
 * Kamion-korlátozások az OSM-ből (Overpass API, ingyenes).
 * Tiltott (hgv=no), súly-, magasság-, szélesség-, hosszkorlát.
 */
export const maxDuration = 60;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

interface OverpassWay {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

function num(v?: string): number | null {
  if (!v) return null;
  const m = v.replace(",", ".").match(/[\d.]+/);
  if (!m) return null;
  let n = parseFloat(m[0]);
  if (/ft|'/.test(v)) n *= 0.3048;
  if (/lbs/.test(v)) n *= 0.000453592;
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  { const u = await getUser(); if (!u || u.status !== "active") return Response.json({ error: "Jelentkezz be." }, { status: 401 }); }
  const sp = req.nextUrl.searchParams;

  // --- „a megálló körül” mód: minden kamionparkoló és pihenőhely egy sugarú körben (alap 40 km) ---
  if (sp.get("mode") === "nearby") {
    const lat = parseFloat(sp.get("lat") ?? ""), lon = parseFloat(sp.get("lon") ?? "");
    const r = Math.min(40, Math.max(1, parseFloat(sp.get("r") ?? "40") || 40));
    if (![lat, lon].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ error: "koordináta" }, { status: 400 });
    // a találatok cache-elhetők: a pontot ~100 m-re kerekítjük
    const la = lat.toFixed(3), lo = lon.toFixed(3);
    const { NearCache } = await getDb();
    const hit = await NearCache.findById(`${la},${lo},${r}`).lean();
    if (hit) return Response.json(hit.fc, { headers: { "Cache-Control": "private, max-age=86400" } });
    const ar = `(around:${Math.round(r * 1000)},${la},${lo})`;
    const qn = `[out:json][timeout:25];(
      nwr["amenity"="parking"]["hgv"~"^(yes|designated)$"]${ar};
      nwr["amenity"="parking"]["capacity:hgv"]${ar};
      nwr["amenity"="parking"]["parking"="truck"]${ar};
      nwr["highway"="rest_area"]["hgv"!="no"]${ar};
      nwr["amenity"="rest_area"]${ar};
      nwr["highway"="services"]${ar};
    );out tags center 1500;`;
    const askN = async (ep: string): Promise<{ elements: OverpassWay[] }> => {
      const res = await fetch(ep, {
        method: "POST", body: "data=" + encodeURIComponent(qn),
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "tesotter-truck-planner/1.0" },
        signal: AbortSignal.timeout(55000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };
    try {
      const data = await Promise.any(ENDPOINTS.map(askN));
      const k = Math.cos((+la * Math.PI) / 180);
      const seen = new Set<string>();
      const features = data.elements.map((el) => {
        const c = el.center ?? (el.lat !== undefined && el.lon !== undefined ? { lat: el.lat, lon: el.lon } : null);
        if (!c) return null;
        const t = el.tags ?? {};
        const kind = t.highway === "services" ? "services" : t.highway === "rest_area" || t.amenity === "rest_area" ? "rest" : "truck";
        const distKm = Math.hypot((c.lon - +lo) * 111.32 * k, (c.lat - +la) * 110.57);
        if (distKm > r + 0.5) return null;
        const key = `${kind}:${c.lat.toFixed(4)}:${c.lon.toFixed(4)}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [c.lon, c.lat] },
          properties: {
            kind, distKm: Math.round(distKm * 10) / 10,
            name: t.name ?? (kind === "services" ? "Szolgáltató terület" : kind === "rest" ? "Pihenőhely" : "Kamionparkoló"),
            capacity: t["capacity:hgv"] ?? null, fee: t.fee ?? null,
            supervised: t.supervised ?? t.surveillance ?? null, operator: t.operator ?? null,
            toilets: t.toilets ?? null, fuel: t["fuel:diesel"] ?? null,
          },
        };
      }).filter(Boolean);
      const fc = { type: "FeatureCollection" as const, features };
      await NearCache.updateOne({ _id: `${la},${lo},${r}` }, { $set: { fc, at: new Date() } }, { upsert: true }).catch(() => {});
      return Response.json(fc, { headers: { "Cache-Control": "private, max-age=86400" } });
    } catch {
      return Response.json({ error: "A parkoló-adatbázis (Overpass) most túlterhelt – próbáld újra." }, { status: 504 });
    }
  }
  const [s, w, n, e] = ["s", "w", "n", "e"].map((k) => parseFloat(sp.get(k) ?? ""));
  if ([s, w, n, e].some((x) => !Number.isFinite(x))) return Response.json({ error: "bbox" }, { status: 400 });
  const parking = sp.get("mode") === "parking";
  if ((n - s) * (e - w) > (parking ? 1.2 : 0.25)) return Response.json({ error: "Túl nagy terület – közelíts rá." }, { status: 413 });

  const bb = `${s},${w},${n},${e}`;
  const qParking = `[out:json][timeout:25];(
    nwr["amenity"="parking"]["hgv"~"^(yes|designated)$"](${bb});
    nwr["amenity"="parking"]["capacity:hgv"](${bb});
    nwr["highway"="rest_area"]["hgv"!="no"](${bb});
    nwr["amenity"="parking"]["parking"="truck"](${bb});
  );out tags center 800;`;
  const q = parking ? qParking : `[out:json][timeout:25];(
    way["highway"]["hgv"~"^(no|destination|delivery)$"](${bb});
    way["highway"]["maxweight"](${bb});
    way["highway"]["maxheight"](${bb});
    way["highway"]["maxwidth"](${bb});
    way["highway"]["maxlength"](${bb});
    way["highway"]["maxaxleload"](${bb});
    way["highway"]["hazmat"="no"](${bb});
  );out tags geom 2500;`;

  const ask = async (ep: string): Promise<{ elements: OverpassWay[] }> => {
    const res = await fetch(ep, {
      method: "POST",
      body: "data=" + encodeURIComponent(q),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "tesotter-truck-planner/1.0",
      },
      signal: AbortSignal.timeout(22000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  try {
    // a leggyorsabb működő tükör nyer
    const data = await Promise.any(ENDPOINTS.map(ask));
    if (parking) {
      const pts = data.elements
        .map((el) => {
          const c = el.center ?? (el.lat !== undefined && el.lon !== undefined ? { lat: el.lat, lon: el.lon } : null);
          if (!c) return null;
          const t = el.tags ?? {};
          return {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [c.lon, c.lat] },
            properties: {
              name: t.name ?? "Kamionparkoló / pihenő",
              capacity: t["capacity:hgv"] ?? null,
              fee: t.fee ?? null,
              supervised: t.supervised ?? t.surveillance ?? null,
              operator: t.operator ?? null,
            },
          };
        })
        .filter(Boolean);
      return Response.json(
        { type: "FeatureCollection", features: pts },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
      );
    }
    const features = data.elements
      .filter((el) => el.geometry && el.geometry.length > 1)
      .map((el) => {
        const t = el.tags ?? {};
        const hgvNo = t.hgv === "no" || t.hgv === "destination" || t.hgv === "delivery";
        return {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: el.geometry!.map((p) => [p.lon, p.lat]) },
          properties: {
            id: el.id,
            name: t.name ?? t.ref ?? "",
            hgv: hgvNo ? t.hgv : null,
            maxweight: num(t.maxweight),
            maxheight: num(t.maxheight),
            maxwidth: num(t.maxwidth),
            maxlength: num(t.maxlength),
            maxaxleload: num(t.maxaxleload),
            hazmat: t.hazmat === "no",
          },
        };
      });
    return Response.json(
      { type: "FeatureCollection", features },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    // alább: hibaág
  }
  return Response.json({ error: "A korlátozás-adatbázis (Overpass) most túlterhelt – próbáld újra pár másodperc múlva." }, { status: 504 });
}
