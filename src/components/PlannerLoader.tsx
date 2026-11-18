"use client";

import dynamic from "next/dynamic";
import type { InitialTrip, Saved } from "./Planner";

const Planner = dynamic(() => import("./Planner"), { ssr: false, loading: () => <div className="flex h-dvh items-center justify-center text-sm text-slate-500">Tervező betöltése…</div> });

export default function PlannerLoader(props: { initialSaved: Saved; initialTrip: InitialTrip | null }) {
  return <Planner {...props} />;
}
