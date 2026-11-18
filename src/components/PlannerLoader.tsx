"use client";

import dynamic from "next/dynamic";
import type { InitialTrip, Saved } from "./Planner";

// a térkép-modul (maplibre) letöltése azonnal indul, párhuzamosan a tervezővel – nem a tervező után (vízesés helyett)
if (typeof window !== "undefined") void import("./MapView");

const Planner = dynamic(() => import("./Planner"), { ssr: false, loading: () => <div className="flex h-dvh items-center justify-center text-sm text-slate-500">Tervező betöltése…</div> });

export default function PlannerLoader(props: { initialSaved: Saved; initialTrip: InitialTrip | null }) {
  return <Planner {...props} />;
}
