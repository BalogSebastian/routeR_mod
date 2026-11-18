import Link from "next/link";
import { COUNTRY_NAMES } from "@/lib/country-names";
import { dur, eur, flag, km } from "@/lib/format";

export interface TripListItem {
  id: string;
  name: string;
  updatedAt: string;
  summary: { distanceKm: number; roadKm: number; tollEur: number; totalEur: number; drivingMin: number; days: number; arrival: string; countries: string[]; roads: string[] };
  from: string;
  to: string;
}

const short = (l: string) => l.split(/[—,]/)[0].trim();
export const tripEnds = (w: { label: string }[]) => ({ from: short(w[0]?.label ?? "?"), to: short(w[w.length - 1]?.label ?? "?") });

export function RoadChips({ roads }: { roads: string[] }) {
  const list = roads.filter((r, i) => roads.indexOf(r) === i).slice(0, 6);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((r) => <span key={r} className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">{r}</span>)}
    </div>
  );
}

export default function TripCard({ t }: { t: TripListItem }) {
  const s = t.summary;
  return (
    <Link href={`/planner?trip=${t.id}`} className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-lg hover:shadow-violet-900/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900 group-hover:text-violet-700">{t.name}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{t.from} → {t.to}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-bold tabular-nums text-slate-900">{eur(s.totalEur)}</div>
          <div className="text-[11px] text-slate-500">{km(s.roadKm)}</div>
        </div>
      </div>
      <div className="mt-3"><RoadChips roads={s.roads} /></div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>⏱ {dur(s.drivingMin)}</span>
        <span>💶 útdíj {eur(s.tollEur)}</span>
        <span className="flex gap-0.5" title={s.countries.map((c) => COUNTRY_NAMES[c] ?? c).join(", ")}>{s.countries.slice(0, 7).map((c) => <span key={c}>{flag(c)}</span>)}</span>
        <span className="ml-auto">{new Date(t.updatedAt).toLocaleDateString("hu-HU")}</span>
      </div>
    </Link>
  );
}
