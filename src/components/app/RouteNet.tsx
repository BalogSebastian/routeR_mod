/** Élő, neonzöld útvonalhálózat háttérnek (tiszta SVG + CSS animáció, nincs JS). */
const NET = [
  "M-40 520 C 120 470, 220 560, 360 480 S 560 380, 760 430",
  "M-40 250 C 120 290, 260 170, 420 230 S 640 320, 760 190",
  "M90 -40 C 120 180, 200 320, 230 460 S 290 700, 320 860",
  "M560 -40 C 520 160, 580 300, 520 460 S 480 700, 510 860",
  "M-40 700 C 180 650, 340 730, 520 650 S 700 610, 760 660",
];
const NODES: [number, number][] = [
  [230, 460],
  [360, 480],
  [420, 230],
  [520, 460],
  [520, 650],
];
export const TRUCK_PATH = NET[0];

export default function RouteNet({ id, truck = false, dim = 1 }: { id: string; truck?: boolean; dim?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 720 800" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: dim }}>
      <defs>
        <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="white" strokeOpacity="0.04" />
        </pattern>
        <radialGradient id={`${id}-glow`} cx="70%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#00ff9d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="720" height="800" fill={`url(#${id}-grid)`} />
      <rect width="720" height="800" fill={`url(#${id}-glow)`} />
      {NET.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="white" strokeOpacity="0.09" strokeWidth={i % 2 ? 1 : 2} pathLength={1} className="rr-draw" style={{ animationDelay: `${0.2 + i * 0.15}s` }} />
          <path d={d} fill="none" stroke="#00ff9d" strokeWidth="3" strokeLinecap="round" pathLength={1} className="rr-flow" style={{ animationDuration: `${6 + i * 1.4}s`, animationDelay: `${i * -1.7}s`, filter: "drop-shadow(0 0 6px #00ff9d)" }} />
        </g>
      ))}
      {NODES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="14" fill="none" stroke="#00ff9d" strokeWidth="1.5" className="rr-ping" style={{ animationDelay: `${i * 0.4}s` }} />
          <circle cx={x} cy={y} r="4" fill="#00ff9d" />
        </g>
      ))}
      {truck && (
        <g className="rr-truck" style={{ offsetPath: `path("${TRUCK_PATH}")` }}>
          <rect x="-16" y="-7" width="22" height="14" rx="2" fill="white" />
          <rect x="7" y="-6.5" width="10" height="13" rx="3" fill="#00ff9d" />
        </g>
      )}
    </svg>
  );
}

/** Közös oldalfejléc a belső oldalakhoz: vonal + mono kicker, nagy, vastag nagybetűs cím, alcím. */
export function PageHead({ kicker, title, sub, right }: { kicker: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-black pb-6">
      <div className="min-w-0">
        <div className="rr-up flex items-center gap-3">
          <span className="h-[2px] w-10 bg-black" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-black/55">{kicker}</span>
        </div>
        <h1 className="mt-4 overflow-hidden pt-[0.08em] text-[clamp(2.2rem,5vw,3.6rem)] font-black uppercase leading-[0.92] tracking-tighter text-black" style={{ fontFamily: "var(--font-brand)" }}>
          <span className="rr-rise" style={{ animationDelay: "0.05s" }}>
            {title}
          </span>
        </h1>
        {sub && (
          <p className="rr-up mt-3 max-w-xl text-[15px] leading-relaxed text-black/55" style={{ animationDelay: "0.2s" }}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
