import Link from "next/link";
import { Logo } from "@/components/Brand";
import RouteNet from "./RouteNet";

const FEATURES = ["Kamion-routing méret, tömeg és ADR szerint", "Útdíj 27 országban, 2026-os tarifákkal", "Komp, vasút, No-Go zónák", "EU 561/2006 menetrend és ETA"];
const COUNTRIES = ["HU", "AT", "DE", "CZ", "SK", "PL", "IT", "FR", "ES", "BE", "NL", "DK", "SE", "GB", "SI", "HR", "RO", "BG"];

/** A tesotter.com stílusú belépő keret: bal oldalt animált fekete panel, jobb oldalt tiszta fehér űrlap. */
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="auth-bg flex min-h-dvh flex-col lg:flex-row">
      {/* ---------- bal: fekete, élő panel ---------- */}
      <aside className="relative flex flex-col overflow-hidden bg-[#050505] text-white lg:sticky lg:top-0 lg:h-dvh lg:w-[52%]">
        <RouteNet id="as" truck />

        <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 lg:py-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="brand-word inline-flex items-baseline gap-2">
              <span className="text-[22px] leading-none text-white">route<b className="text-[#00ff9d]">R</b></span>
              <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">by tesotter</span>
            </span>
          </Link>
          <span className="hidden items-center gap-2 border border-white/25 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff9d]" /> Béta
          </span>
        </div>

        <div className="relative z-10 hidden flex-1 flex-col justify-center px-10 lg:flex xl:px-16">
          <div className="rr-up mb-8 font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#00ff9d]" style={{ animationDelay: "0.3s" }}>
            Kamion-útvonaltervező · útdíj-kalkulátor
          </div>
          <h2 className="font-black uppercase leading-[0.86] tracking-tighter" style={{ fontFamily: "var(--font-brand)" }}>
            {[
              { t: "Kamion", cls: "text-[clamp(3rem,6.2vw,6.5rem)]" },
              { t: "útvonal.", cls: "text-[clamp(3rem,6.2vw,6.5rem)]" },
              { t: "Útdíjjal együtt.", cls: "text-[clamp(1.9rem,3.7vw,3.9rem)] text-transparent [-webkit-text-stroke:1.5px_white]" },
            ].map((l, i) => (
              <span key={l.t} className={`-mt-[0.12em] block overflow-hidden pt-[0.14em] ${l.cls}`}>
                <span className="rr-rise" style={{ animationDelay: `${0.35 + i * 0.12}s` }}>
                  {l.t}
                </span>
              </span>
            ))}
          </h2>
          <ul className="mt-12 grid max-w-xl gap-3 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <li key={f} className="rr-up flex items-start gap-3 border-t border-white/10 pt-3 text-[14px] leading-snug text-white/70" style={{ animationDelay: `${0.9 + i * 0.1}s` }}>
                <span className="mt-0.5 font-mono text-[11px] font-bold text-[#00ff9d]">0{i + 1}</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 hidden overflow-hidden border-t border-white/10 py-4 lg:block">
          <div className="rr-marquee flex w-max gap-8 whitespace-nowrap font-mono text-[13px] font-bold tracking-widest text-white/35">
            {[...COUNTRIES, ...COUNTRIES].map((c, i) => (
              <span key={i} className="flex items-center gap-8">
                {c}
                <span className="inline-block h-1.5 w-1.5 rotate-45 bg-[#00ff9d]" />
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* ---------- jobb: űrlap ---------- */}
      <main className="flex flex-1 flex-col bg-white">
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-[420px]">
            <div className="rr-up mb-6 flex items-center gap-3" style={{ animationDelay: "0.15s" }}>
              <span className="h-[2px] w-10 bg-black" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-black/60">routeR fiók</span>
            </div>
            <h1 className="overflow-hidden pt-[0.1em] text-[clamp(2.4rem,5vw,3.4rem)] font-black uppercase leading-[0.92] tracking-tighter text-black" style={{ fontFamily: "var(--font-brand)" }}>
              <span className="rr-rise" style={{ animationDelay: "0.2s" }}>
                {title}
              </span>
            </h1>
            <p className="rr-up mt-4 text-[16px] leading-relaxed text-black/55" style={{ animationDelay: "0.35s" }}>
              {subtitle}
            </p>
            <div className="rr-up mt-10" style={{ animationDelay: "0.45s" }}>
              {children}
            </div>
            {footer && (
              <div className="rr-up mt-10 border-t border-black/10 pt-6 text-[14px] text-black/55" style={{ animationDelay: "0.55s" }}>
                {footer}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-6 py-5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-black/40 sm:px-12">
          <span>
            © tesotter ·{" "}
            <a className="text-black/60 underline-offset-4 hover:text-black hover:underline" href="https://www.tesotter.com">
              www.tesotter.com
            </a>
          </span>
          <span className="hidden sm:inline">EU · Frankfurt</span>
        </div>
      </main>
    </div>
  );
}
