import Link from "next/link";
import { Logo } from "@/components/Brand";
import RouteNet from "./RouteNet";

const LETTER = ["Kedves Fuvarozó!", "Köszönjük, hogy a routeR-t választod.", "Neked építettük: útdíj, pihenők, tilalmak – egy helyen, Excel nélkül.", "Jó utat és sok sikeres fuvart!"];
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
          <h2 className="font-black uppercase leading-[0.86] tracking-tighter [@media(max-height:820px)]:text-[0.8em]" style={{ fontFamily: "var(--font-brand)" }}>
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
          {/* kézírásos köszönőlevél: berepül, megpördül, lebeg */}
          <figure className="rr-float mt-12 max-w-[440px] xl:ml-10">
            <div className="rr-card-in relative" style={{ animationDelay: "1s" }}>
              <span aria-hidden className="absolute -top-3 left-8 z-10 h-6 w-24 -rotate-6 bg-[#00ff9d]/75" />
              <span aria-hidden className="absolute -top-2 right-10 z-10 h-6 w-20 rotate-[9deg] bg-white/55" />
              <div
                className="relative overflow-hidden rounded-[4px] px-7 pb-6 pt-7 text-[#1a2a6c] shadow-[0_30px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(0,255,157,0.15)]"
                style={{
                  background: "#fffdf5",
                  backgroundImage: "linear-gradient(90deg, transparent 30px, rgba(255,90,90,0.28) 30px, rgba(255,90,90,0.28) 31px, transparent 31px), repeating-linear-gradient(180deg, transparent 0 25px, rgba(0,120,200,0.12) 25px 26px)",
                }}
              >
                <blockquote className="font-script pl-4 text-[19px] leading-[26px]">
                  {LETTER.map((l, i) => (
                    <p key={i} className={`rr-write ${i === 0 ? "text-[24px] font-bold text-black" : ""}`} style={{ animationDelay: `${2 + i * 0.55}s` }}>
                      {l}
                    </p>
                  ))}
                </blockquote>
                <figcaption className="rr-write mt-3 pl-4" style={{ animationDelay: `${2 + LETTER.length * 0.55}s`, animationDuration: "1.2s" }}>
                  <span className="font-script block text-[24px] font-bold leading-7 text-black">Erick, Sebastian és Gergő</span>
                  <span className="mt-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-black/45">a Tesotter tulajdonosai és az egész csapat</span>
                </figcaption>
                <svg aria-hidden viewBox="0 0 100 100" className="rr-stamp absolute -right-2 bottom-3 h-20 w-20" style={{ animationDelay: `${2.6 + LETTER.length * 0.55}s` }}>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#00a866" strokeWidth="3" />
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#00a866" strokeWidth="1.2" />
                  <text x="50" y="48" textAnchor="middle" fontSize="11" fontWeight="900" fill="#00a866">KÖSZÖNJÜK</text>
                  <text x="50" y="64" textAnchor="middle" fontSize="15" fill="#00a866">♥</text>
                </svg>
              </div>
            </div>
          </figure>
        </div>

        <div className="relative z-10 hidden overflow-hidden border-t border-white/10 py-4 lg:block">
          <div className="rr-marquee flex w-max gap-8 whitespace-nowrap font-mono text-[13px] font-bold tracking-widest text-white/35">
            {[...FEATURES, ...COUNTRIES, ...FEATURES, ...COUNTRIES].map((c, i) => (
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
