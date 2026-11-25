import type { Vehicle } from "@/lib/types";

/**
 * Méretarányos oldalnézet a jármű adataiból: hossz, magasság, tengelyszám
 * (szóló / nyerges / pótkocsis felépítés a hossz és a tengelyszám alapján).
 */
export default function TruckSide({ v, accent = "#00ff9d", dims = true, className = "" }: { v: Vehicle; accent?: string; dims?: boolean; className?: string }) {
  const W = 300, H = 120, ground = 96;
  const scale = 250 / 19; // px / m (19 m fér el)
  const L = Math.max(5, Math.min(19, v.length)) * scale;
  const Hh = Math.max(2, Math.min(4.6, v.height)) * scale;
  const x0 = (W - L) / 2;
  const top = ground - Hh;
  const van = v.weight <= 3.5;
  const artic = !van && v.length >= 13 && v.length < 17.5;
  const drawbar = !van && v.length >= 17.5;
  const cabL = (van ? 1.6 : 2.3) * scale;
  const cabH = Math.min(Hh, (van ? 2.2 : 3.1) * scale);
  const wheelR = (van ? 0.36 : 0.5) * scale;
  // tengelyek elhelyezése
  const axles = Math.max(2, Math.min(7, v.axles));
  const xs: number[] = [];
  if (artic) {
    const tractor = axles >= 6 ? 3 : 2, trailer = axles - tractor;
    xs.push(x0 + cabL * 0.5);
    for (let i = 1; i < tractor; i++) xs.push(x0 + cabL + 1.2 * scale + (i - 1) * 1.35 * scale);
    for (let i = 0; i < trailer; i++) xs.push(x0 + L - 1.6 * scale - i * 1.35 * scale);
  } else if (drawbar) {
    const front = Math.ceil(axles / 2), back = axles - front;
    const split = x0 + L * 0.52;
    xs.push(x0 + cabL * 0.5);
    for (let i = 1; i < front; i++) xs.push(split - 1.4 * scale - (i - 1) * 1.35 * scale);
    for (let i = 0; i < back; i++) xs.push(split + 1.8 * scale + i * 3.2 * scale);
  } else {
    xs.push(x0 + cabL * 0.55);
    for (let i = 1; i < axles; i++) xs.push(x0 + L - 1.4 * scale - (axles - 1 - i) * 1.35 * scale);
  }
  const body = drawbar
    ? [{ x: x0 + cabL + 0.15 * scale, w: L * 0.52 - cabL - 0.15 * scale }, { x: x0 + L * 0.52 + 0.5 * scale, w: L * 0.48 - 0.5 * scale }]
    : [{ x: x0 + cabL + (artic ? 0.35 : 0.15) * scale, w: L - cabL - (artic ? 0.35 : 0.15) * scale }];
  const bodyTop = top;
  const bodyBottom = ground - wheelR * 1.15;
  const label = (t: string, x: number, y: number, anchor: "start" | "middle" | "end" = "middle") => (
    <text x={x} y={y} textAnchor={anchor} fontSize="9" fontWeight="700" fontFamily="ui-monospace, Menlo, monospace" fill="currentColor" opacity="0.55">{t}</text>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`${v.length} m hosszú, ${v.height} m magas, ${v.axles} tengelyes jármű`}>
      <line x1="6" x2={W - 6} y1={ground + wheelR * 0.0 + 0.5} y2={ground + 0.5} stroke="currentColor" strokeOpacity="0.18" strokeDasharray="3 4" />
      {/* felépítmény */}
      {body.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={bodyTop} width={b.w} height={bodyBottom - bodyTop} fill="currentColor" fillOpacity="0.92" />
          <rect x={b.x} y={bodyTop} width={b.w} height={3} fill={accent} />
          {v.hazmat && <g transform={`translate(${b.x + b.w - 14},${bodyTop + 8})`}><rect width="10" height="7" fill="#ff8a00" /><rect y="3" width="10" height="1" fill="#000" /></g>}
        </g>
      ))}
      {drawbar && <line x1={x0 + L * 0.52 - 0.1 * scale} x2={x0 + L * 0.52 + 0.5 * scale} y1={bodyBottom - 4} y2={bodyBottom - 4} stroke="currentColor" strokeWidth="2" />}
      {/* fülke */}
      <path d={`M${x0} ${ground - wheelR * 1.15} V${ground - cabH + 6} Q${x0} ${ground - cabH} ${x0 + 6} ${ground - cabH} H${x0 + cabL} V${ground - wheelR * 1.15} Z`} fill="currentColor" />
      <path d={`M${x0 + 3} ${ground - cabH + 7} H${x0 + cabL * 0.62} V${ground - cabH + cabH * 0.42} H${x0 + 3} Z`} fill={accent} fillOpacity="0.85" />
      {/* kerekek */}
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ground - wheelR} r={wheelR} fill="currentColor" />
          <circle cx={x} cy={ground - wheelR} r={wheelR * 0.42} fill={accent} fillOpacity="0.9" />
        </g>
      ))}
      {dims && (
        <g>
          <line x1={x0} x2={x0 + L} y1={ground + 12} y2={ground + 12} stroke="currentColor" strokeOpacity="0.4" />
          <line x1={x0} x2={x0} y1={ground + 8} y2={ground + 16} stroke="currentColor" strokeOpacity="0.4" />
          <line x1={x0 + L} x2={x0 + L} y1={ground + 8} y2={ground + 16} stroke="currentColor" strokeOpacity="0.4" />
          {label(`${v.length.toLocaleString("hu-HU")} m`, x0 + L / 2, ground + 22)}
          <line x1={x0 + L + 9} x2={x0 + L + 9} y1={top} y2={ground} stroke="currentColor" strokeOpacity="0.4" />
          <line x1={x0 + L + 5} x2={x0 + L + 13} y1={top} y2={top} stroke="currentColor" strokeOpacity="0.4" />
          {label(`${v.height.toLocaleString("hu-HU")} m`, x0 + L + 15, top + (ground - top) / 2 + 3, "start")}
        </g>
      )}
    </svg>
  );
}
