"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { SidebarData } from "@/lib/app-data";

/* ---------- élő menü-jelvények (jóváhagyásra várók, friss sofőr-megnyitások) ---------- */

export function useSidebarData(): SidebarData | null {
  const path = usePathname();
  const [data, setData] = useState<SidebarData | null>(null);
  const load = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    const r = await fetch("/api/app/sidebar", { cache: "no-store" }).catch(() => null);
    if (r?.ok) setData((await r.json().catch(() => null)) as SidebarData | null);
  }, []);
  // oldalváltáskor (pl. mentés vagy jóváhagyás után) és percenként frissül
  useEffect(() => {
    let alive = true;
    fetch("/api/app/sidebar", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: SidebarData | null) => { if (alive && j) setData(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [path]);
  useEffect(() => {
    const id = window.setInterval(load, 60_000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    window.addEventListener("routeR:refresh", load);
    return () => { clearInterval(id); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", load); window.removeEventListener("routeR:refresh", load); };
  }, [load]);
  return data;
}
