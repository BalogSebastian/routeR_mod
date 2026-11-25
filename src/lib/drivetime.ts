/**
 * Vezetési és pihenőidők (EU 561/2006) – tájékoztató számítás, a tachográf a mérvadó.
 *  - napi vezetés 9 óra, hetente legfeljebb kétszer 10 óra
 *  - 4,5 óra vezetés után 45 perc szünet
 *  - napi pihenő 11 óra (csökkentett: 9 óra, két heti pihenő között legfeljebb 3-szor),
 *    az előző pihenő végétől számított 24 órán belül → 13 (csökkentettel 15) órás munkanap
 *  - heti vezetés 56 óra, két egymást követő héten 90 óra; heti pihenő 45 óra
 *  - dupla személyzet: 30 órán belül 9 óra pihenő, a szünetet a másik sofőr vezetése alatt tartják
 */

const H = 3600_000, M = 60_000;
export const DAY_MAX = 9 * H, DAY_EXT = 10 * H, BLOCK = 4.5 * H, BREAK = 45 * M;
export const REST = 11 * H, REST_RED = 9 * H, WEEK_MAX = 56 * H, TWO_WEEK = 90 * H, WEEK_REST = 45 * H;

export interface DriverState {
  /** ma (az utolsó napi pihenő óta) vezetett idő */
  dayDrive: number;
  /** az utolsó (legalább 45 perces) szünet óta vezetett idő */
  sinceBreak: number;
  /** a napi pihenő vége (a munkanap kezdete), ms */
  dayStart: number;
  /** ezen a héten (hétfő 00:00 óta) vezetett idő */
  weekDrive: number;
  /** az előző héten vezetett idő */
  prevWeek: number;
  /** a héten már felhasznált 10 órás napok */
  extUsed: number;
  /** a heti pihenő óta felhasznált csökkentett napi pihenők */
  reducedUsed: number;
}

export interface Limits {
  todayLeft: number; blockLeft: number; weekLeft: number; twoWeekLeft: number; dayMax: number;
  /** a napi pihenőt legkésőbb ekkor el kell kezdeni */
  restBy: number;
  binding: "day" | "week" | "twoWeek" | "span";
}

export function limits(s: DriverState, now: number, useReduced = true): Limits {
  const dayMax = s.extUsed < 2 ? DAY_EXT : DAY_MAX;
  const span = useReduced && s.reducedUsed < 3 ? 15 * H : 13 * H;
  const restBy = s.dayStart + span;
  const c = {
    day: dayMax - s.dayDrive,
    week: WEEK_MAX - s.weekDrive,
    twoWeek: TWO_WEEK - s.prevWeek - s.weekDrive,
    span: restBy - now,
  };
  const binding = (Object.entries(c) as [Limits["binding"], number][]).sort((a, b) => a[1] - b[1])[0][0];
  return { todayLeft: Math.max(0, Math.min(c.day, c.week, c.twoWeek, c.span)), blockLeft: Math.max(0, BLOCK - s.sinceBreak), weekLeft: Math.max(0, c.week), twoWeekLeft: Math.max(0, c.twoWeek), dayMax, restBy, binding };
}

export type StepKind = "drive" | "break" | "rest" | "weekRest";
export interface Step { kind: StepKind; start: number; end: number; note?: string }

export interface SimOpts { useExt: boolean; useReduced: boolean; dual: boolean }

/** hétfő 00:00 a megadott idő után (helyi idő) */
function nextMonday(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const add = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + add);
  return d.getTime();
}

/** a hátralévő vezetési idő végigszimulálása a szabályokkal: lépések és érkezés */
export function simulate(start: number, driveMs: number, s0: DriverState, o: SimOpts): { steps: Step[]; arrival: number; breaks: number; rests: number } {
  const s = { ...s0 };
  const steps: Step[] = [];
  let t = start, left = driveMs, guard = 0;
  let monday = nextMonday(t);
  const push = (kind: StepKind, a: number, b: number, note?: string) => {
    const last = steps[steps.length - 1];
    if (last && last.kind === kind && last.end === a) last.end = b; else steps.push({ kind, start: a, end: b, note });
  };
  const rollWeek = () => { while (t >= monday) { s.prevWeek = s.weekDrive; s.weekDrive = 0; s.extUsed = 0; monday = nextMonday(monday); } };
  const k = o.dual ? 2 : 1;

  while (left > 0 && guard++ < 500) {
    rollWeek();
    const dayMax = (o.useExt && s.extUsed < 2 ? DAY_EXT : DAY_MAX) * k;
    const reduced = o.dual || (o.useReduced && s.reducedUsed < 3);
    const spanEnd = s.dayStart + (o.dual ? 21 * H : reduced ? 15 * H : 13 * H);
    const can = Math.min(
      left,
      o.dual ? Infinity : BLOCK - s.sinceBreak,
      dayMax - s.dayDrive,
      WEEK_MAX * k - s.weekDrive,
      TWO_WEEK * k - s.prevWeek - s.weekDrive,
      spanEnd - t,
      monday - t,
    );
    if (can > 0) {
      push("drive", t, t + can);
      t += can; left -= can; s.dayDrive += can; s.sinceBreak += can; s.weekDrive += can;
      continue;
    }
    rollWeek();
    if (t >= monday) continue;
    // a heti / kétheti keret elfogyott → heti pihenő
    if (s.weekDrive >= WEEK_MAX * k - 1 || s.prevWeek + s.weekDrive >= TWO_WEEK * k - 1) {
      push("weekRest", t, t + WEEK_REST, "heti pihenő");
      t += WEEK_REST; s.dayDrive = 0; s.sinceBreak = 0; s.dayStart = t; s.reducedUsed = 0;
      continue;
    }
    // 4,5 óra után szünet, ha a napból még van
    if (!o.dual && s.sinceBreak >= BLOCK - 1 && s.dayDrive < dayMax && t + BREAK < spanEnd) {
      push("break", t, t + BREAK, "45 perc szünet");
      t += BREAK; s.sinceBreak = 0;
      continue;
    }
    // napi pihenő
    const rest = reduced ? REST_RED : REST;
    if (s.dayDrive > DAY_MAX * k + 1) s.extUsed++;
    if (reduced && !o.dual) s.reducedUsed++;
    push("rest", t, t + rest, reduced ? `${o.dual ? "9 órás pihenő (dupla személyzet)" : "csökkentett napi pihenő (9 óra)"}` : "napi pihenő (11 óra)");
    t += rest; s.dayDrive = 0; s.sinceBreak = 0; s.dayStart = t;
  }
  return { steps, arrival: t, breaks: steps.filter((x) => x.kind === "break").length, rests: steps.filter((x) => x.kind === "rest" || x.kind === "weekRest").length };
}

export const hm = (ms: number) => { const m = Math.max(0, Math.round(ms / M)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
export const parseHm = (s: string): number => {
  const m = s.trim().match(/^(\d{1,3})(?:[:.,](\d{1,2}))?$/);
  if (!m) return NaN;
  return Number(m[1]) * H + (m[2] ? Number(m[2].padEnd(2, "0")) * M : 0);
};
