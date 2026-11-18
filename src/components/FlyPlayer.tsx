"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FlyData } from "@/lib/flydata";
import Flyover from "./Flyover";

maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

/** Önálló, teljes képernyős útvonal-lejátszó (a sofőr-oldalról / megosztott linkről) – saját térképpel. */
export default function FlyPlayer({ data, onClose }: { data: FlyData; onClose: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MLMap | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: data.geometry[0],
      zoom: 6,
      attributionControl: { compact: true, customAttribution: [] },
    });
    m.on("load", () => setMap(m));
    return () => { setMap(null); m.remove(); };
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900">
      <div ref={el} className="absolute inset-0" />
      {map && <Flyover map={map} data={data} onClose={onClose} />}
      {!map && <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/80">Térkép betöltése…</div>}
    </div>
  );
}
