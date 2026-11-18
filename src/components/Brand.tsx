/** routeR jel: lilás lekerekített négyzet, útvonal-ív, kezdő- és végpont */
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} fill="none" aria-hidden>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="#7c5cf5" />
      <path d="M15 43c8-2 8-17 17-17s9 12 18 8" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="15" cy="43" r="5" fill="#fff" />
      <circle cx="50" cy="34" r="5" fill="#fff" fillOpacity=".55" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-word inline-flex items-baseline gap-2 ${className}`}>
      <span className="text-[22px] leading-none text-slate-900">route<b className="text-violet-600">R</b></span>
      <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">by tesotter</span>
    </span>
  );
}
