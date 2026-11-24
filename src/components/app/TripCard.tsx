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
  favorite?: boolean;
}

const short = (l: string) => l.split(/[—,]/)[0].trim();
export const tripEnds = (w: { label: string }[]) => ({ from: short(w[0]?.label ?? "?"), to: short(w[w.length - 1]?.label ?? "?") });

export function RoadChips({ roads }: { roads: string[] }) {
  const list = roads.filter((r, i) => roads.indexOf(r) === i).slice(0, 6);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((r) => <span key={r} className="bg-black px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wide text-[#00ff9d]">{r}</span>)}
    </div>
  );
}

export default function TripCard({ t }: { t: TripListItem }) {
  const s = t.summary;
  return (
    <Link href={`/planner?trip=${t.id}`} className="group relative block overflow-hidden border-2 border-black bg-white p-5 transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#00ff9d]">
      <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[#00ff9d] transition-transform duration-500 group-hover:scale-x-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate text-[16px] font-black uppercase tracking-tight text-black">{t.favorite && <span className="text-amber-500" title="Kedvenc">★</span>}<span className="truncate">{t.name}</span></div>
          <div className="mt-2 flex items-center gap-2 text-[12.5px] font-medium text-slate-500">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><span className="truncate">{t.from}</span>
            <span className="h-px w-4 shrink-0 bg-slate-300" />
            <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /><span className="truncate">{t.to}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[20px] font-black tabular-nums text-black" style={{ fontFamily: "var(--font-brand)" }}>{eur(s.totalEur)}</div>
          <div className="font-mono text-[11px] font-bold text-black/45">{km(s.roadKm)}</div>
        </div>
      </div>
      <div className="mt-3.5"><RoadChips roads={s.roads} /></div>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t-2 border-dashed border-black/10 pt-3.5 text-[11.5px] font-semibold text-black/65">
        <span className="border border-black/15 px-2 py-1 font-mono">⏱ {dur(s.drivingMin)}</span>
        <span className="bg-[#00ff9d]/25 px-2 py-1 font-mono text-black">💶 útdíj {eur(s.tollEur)}</span>
        <span className="flex gap-0.5" title={s.countries.map((c) => COUNTRY_NAMES[c] ?? c).join(", ")}>{s.countries.slice(0, 7).map((c) => <span key={c}>{flag(c)}</span>)}</span>
        <span className="ml-auto font-mono text-black/35">{new Date(t.updatedAt).toLocaleDateString("hu-HU")}</span>
      </div>
    </Link>
  );
}
