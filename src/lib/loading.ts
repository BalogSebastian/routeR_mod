/**
 * Raklap-elrendezés a rakfelületen (felülnézet, cm). Soronkénti rakás: minden raklaptípusnál
 * kipróbálja a hosszanti és keresztirányú elhelyezést és ezek keverékét, a legtöbb raklapot / legrövidebb hosszt választja.
 */

export interface Trailer { id: string; name: string; decks: number[]; width: number; payload: number; height: number }
export const TRAILERS: Trailer[] = [
  { id: "tautliner", name: "Ponyvás nyerges · 13,6 m", decks: [1360], width: 248, payload: 24000, height: 270 },
  { id: "mega", name: "Mega nyerges · 13,6 m", decks: [1360], width: 248, payload: 24000, height: 300 },
  { id: "reefer", name: "Hűtős nyerges · 13,3 m", decks: [1330], width: 246, payload: 22000, height: 260 },
  { id: "jumbo", name: "Pótkocsis szerelvény · 7,7 + 7,7 m", decks: [770, 770], width: 248, payload: 24000, height: 300 },
  { id: "rigid", name: "Szóló · 7,2 m", decks: [720], width: 248, payload: 10000, height: 260 },
  { id: "van", name: "Kisteher · 4,2 m", decks: [420], width: 205, payload: 1200, height: 220 },
];

export interface PalletType { id: string; name: string; l: number; w: number; qty: number; kg: number; stack: boolean; color: string }
export const PALLET_PRESETS = [
  { name: "EUR raklap", l: 120, w: 80 },
  { name: "Ipari raklap", l: 120, w: 100 },
  { name: "Fél EUR", l: 80, w: 60 },
  { name: "Negyed (display)", l: 60, w: 40 },
];
export const COLORS = ["#00ff9d", "#0a0a0a", "#ffb020", "#4aa8ff", "#ff5c8a", "#9b8cff"];

export interface Placed { x: number; y: number; l: number; w: number; type: string; stacked: boolean; deck: number; n: number }
export interface LoadResult {
  placed: Placed[];
  perType: Record<string, { placed: number; left: number }>;
  used: number[];
  ldm: number;
  weight: number;
  /** a rakomány súlypontja a rakfelület hosszának arányában (0 = eleje) */
  cog: number | null;
}

interface Option { across: number; depth: number; pl: number; pw: number }
const options = (t: { l: number; w: number }, width: number): Option[] => {
  const o: Option[] = [];
  const a = Math.floor(width / t.w); if (a > 0) o.push({ across: a, depth: t.l, pl: t.l, pw: t.w }); // hosszanti
  const b = Math.floor(width / t.l); if (b > 0) o.push({ across: b, depth: t.w, pl: t.w, pw: t.l }); // keresztben
  return o;
};

/** a legjobb sorkombináció: k sor az egyik, j sor a másik irányban */
function bestRows(units: number, room: number, opts: Option[]) {
  let best = { placed: 0, len: 0, rows: [] as Option[] };
  if (!opts.length) return best;
  const [A, B] = [opts[0], opts[1] ?? opts[0]];
  for (let k = 0; k <= Math.ceil(units / A.across); k++) {
    const lenA = k * A.depth;
    if (lenA > room) break;
    const placedA = Math.min(units, k * A.across);
    const restUnits = units - placedA;
    const j = Math.min(Math.ceil(restUnits / B.across), Math.floor((room - lenA) / B.depth));
    const placed = placedA + Math.min(restUnits, j * B.across);
    const len = lenA + j * B.depth;
    if (placed > best.placed || (placed === best.placed && len < best.len)) best = { placed, len, rows: [...Array(k).fill(A), ...Array(j).fill(B)] };
  }
  return best;
}

export function pack(trailer: Trailer, types: PalletType[]): LoadResult {
  const placed: Placed[] = [];
  const perType: LoadResult["perType"] = {};
  const used = trailer.decks.map(() => 0);
  let n = 0;
  // nagyobb alapterületű raklapok elöl
  const order = [...types].filter((t) => t.qty > 0 && t.l > 0 && t.w > 0).sort((a, b) => b.l * b.w - a.l * a.w);
  for (const t of order) {
    // egymásra rakható: két raklap egy helyen; páratlan darabszámnál az utolsó hely szimpla
    const totalUnits = t.stack ? Math.ceil(t.qty / 2) : t.qty;
    let units = totalUnits;
    let unitIdx = 0;
    let placedQty = 0;
    for (let d = 0; d < trailer.decks.length && units > 0; d++) {
      const room = trailer.decks[d] - used[d];
      const best = bestRows(units, room, options(t, trailer.width));
      let x = used[d];
      let left = best.placed;
      for (const r of best.rows) {
        const inRow = Math.min(r.across, left);
        const gap = (trailer.width - r.across * r.pw) / (r.across + 1);
        for (let i = 0; i < inRow; i++) {
          const stacked = t.stack && !(t.qty % 2 === 1 && unitIdx === totalUnits - 1);
          placed.push({ x, y: gap + i * (r.pw + gap), l: r.pl, w: r.pw, type: t.id, stacked, deck: d, n: ++n });
          placedQty += stacked ? 2 : 1;
          unitIdx++;
        }
        left -= inRow;
        x += r.depth;
      }
      used[d] += best.len;
      units -= best.placed;
    }
    perType[t.id] = { placed: Math.min(placedQty, t.qty), left: Math.max(0, t.qty - placedQty) };
  }
  const weightOf = (p: Placed) => (types.find((t) => t.id === p.type)?.kg ?? 0) * (p.stacked ? 2 : 1);
  const weight = types.reduce((a, t) => a + t.kg * (perType[t.id]?.placed ?? 0), 0);
  const total = trailer.decks.reduce((a, b) => a + b, 0);
  let off = 0; const offs = trailer.decks.map((l) => { const o = off; off += l; return o; });
  const cog = weight > 0 ? placed.reduce((a, p) => a + (offs[p.deck] + p.x + p.l / 2) * weightOf(p), 0) / weight / total : null;
  const ldm = placed.reduce((a, p) => a + (p.l * p.w) / 240 / 100, 0);
  return { placed, perType, used, ldm, weight, cog };
}

/** egyetlen raklaptípusból legfeljebb hány fér fel (egy szinten) */
export function capacity(trailer: Trailer, l: number, w: number): number {
  return trailer.decks.reduce((a, len) => a + bestRows(10_000, len, options({ l, w }, trailer.width)).placed, 0);
}
