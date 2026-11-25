import type { UpcomingBan } from "./bans";

/** azonos idősávú tilalmak egy csoportban (pl. „Szo 22:00 – Vas 22:00 · HU FR”) */
export interface BanGroup { start: number; end: number; active: boolean; holiday: boolean; ccs: string[] }

export function groupBans(list: UpcomingBan[]): BanGroup[] {
  const m = new Map<string, BanGroup>();
  for (const b of list) {
    const k = `${b.start}-${b.end}`;
    const g = m.get(k) ?? { start: b.start, end: b.end, active: b.active, holiday: false, ccs: [] };
    g.ccs.push(b.cc);
    g.holiday ||= b.holiday;
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => Number(b.active) - Number(a.active) || a.start - b.start);
}

const DAYS = ["vas", "hét", "kedd", "szer", "csüt", "pén", "szo"];
const DAYS_LONG = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];
const pad = (n: number) => String(n).padStart(2, "0");
const DAY = 86400_000;

export const hm = (t: number) => { const d = new Date(t); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const dayName = (t: number, long = false) => (long ? DAYS_LONG : DAYS)[new Date(t).getUTCDay()];
export const ymd = (t: number) => { const d = new Date(t); return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}.`; };

/** „ma 22:00”, „holnap 05:00”, „szo 15:00” (közép-európai idő) */
export function when(t: number, now: number): string {
  const dd = Math.floor(t / DAY) - Math.floor(now / DAY);
  const day = dd === 0 ? "ma" : dd === 1 ? "holnap" : dd === -1 ? "tegnap" : dayName(t);
  return `${day} ${hm(t)}`;
}

/** hátralévő idő röviden: „3 ó 20 p”, „2 nap 4 ó” */
export function left(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d) return `${d} nap${h ? ` ${h} ó` : ""}`;
  if (h) return `${h} ó${m ? ` ${m} p` : ""}`;
  return `${m} p`;
}
