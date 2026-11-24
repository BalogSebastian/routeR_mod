"use client";

import { useEffect, useState } from "react";

/**
 * Személyes, kézírásos köszönőlevél felugró ablakban.
 * Felhasználónként (e-mail-cím szerint) egyszer jelenik meg, a böngészőben megjegyezve.
 * Tisztán megjelenítési elem: semmilyen adatot nem küld és nem módosít.
 */
export const LETTER_EVENT = "routeR:letter";
export const openWelcomeLetter = () => window.dispatchEvent(new Event(LETTER_EVENT));

export default function WelcomeLetter({ name, email, pending = false }: { name: string; email: string; pending?: boolean }) {
  const key = `routeR.welcome.v1.${email.toLowerCase()}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
    } catch {
      /* tiltott tároló: ilyenkor is megmutatjuk egyszer */
    }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [key]);

  // bármikor újra megnyitható (pl. az oldalsáv levél-kártyájáról)
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(LETTER_EVENT, show);
    return () => window.removeEventListener(LETTER_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* nem baj */
    }
    setOpen(false);
  }

  if (!open) return null;

  const lines: { t: string; cls?: string }[] = [
    { t: `Kedves ${name}!`, cls: "pr-20 text-[32px] leading-[40px] sm:pr-0 sm:text-[38px] text-black" },
    { t: "Köszönjük, hogy a routeR-t választottad, és kipróbálod velünk." },
    { t: "Fuvarozóknak építettük, akiknek elegük lett abból, hogy az útdíjat Excelben, a pihenőket fejben, az útvonalat pedig autós térképen számolják." },
    pending
      ? { t: "A fiókodat hamarosan jóváhagyjuk, és e-mailben szólunk, amint indulhatsz." }
      : { t: "A fiókod él: tervezd meg az első fuvarodat, és nézd meg, mennyi idő marad máshoz." },
    { t: "Minden visszajelzésed számít nekünk. Ha valami nem úgy működik, ahogy várnád, írj nekünk bátran: egy tulajdonos olvassa el, és a csapatból a legjobb ember válaszol." },
    { t: "Jó utat és sok sikeres fuvart!" },
  ];
  const base = 2.1;
  const step = 0.75;
  const sigAt = base + lines.length * step;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rr-letter-title" className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4 sm:p-8">
      <button aria-label="Bezárás" onClick={close} className="rr-backdrop fixed inset-0 cursor-default bg-black/70 backdrop-blur-sm" />

      {/* boríték: beesik, a pecsét elpattan, a fedél kinyílik, majd lehull */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] flex items-center justify-center [perspective:900px]">
        <div className="rr-env relative h-[220px] w-[340px] sm:h-[250px] sm:w-[400px]">
          <div className="absolute inset-0 bg-[#efe8d2] shadow-[0_30px_70px_rgba(0,0,0,0.5)]" />
          <div className="absolute inset-0 bg-[#e4dbbf] [clip-path:polygon(0_100%,50%_48%,100%_100%)]" />
          <div className="absolute inset-0 bg-[#e9e1c8] [clip-path:polygon(0_0,50%_52%,0_100%)]" />
          <div className="absolute inset-0 bg-[#e9e1c8] [clip-path:polygon(100%_0,50%_52%,100%_100%)]" />
          <div className="rr-flap absolute inset-x-0 top-0 h-[56%] bg-[#f6f0dc] [backface-visibility:visible] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
          <div className="rr-seal absolute left-1/2 top-[52%] flex h-14 w-14 items-center justify-center rounded-full bg-[#00ff9d] font-black text-black shadow-[0_0_30px_#00ff9d]" style={{ fontFamily: "var(--font-brand)" }}>R</div>
          <div className="absolute bottom-4 left-5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-black/40">Neked · {name}</div>
        </div>
      </div>
      {/* fényvillanás és konfetti, amikor a levél kiemelkedik */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[3] flex items-center justify-center">
        <span className="rr-flash absolute h-72 w-72 rounded-full bg-[radial-gradient(circle,#00ff9d_0%,transparent_65%)]" style={{ animationDelay: "1.05s" }} />
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className={`rr-burst absolute ${i % 3 === 0 ? "h-3 w-3 bg-[#00ff9d]" : i % 3 === 1 ? "h-2 w-4 bg-white" : "h-2.5 w-2.5 rounded-full bg-[#00c97b]"}`}
            style={{ ["--a" as string]: `${i * 20}deg`, ["--d" as string]: `${220 + (i % 4) * 70}px`, animationDelay: `${1.1 + (i % 3) * 0.05}s` }}
          />
        ))}
      </div>

      <div className="rr-letter relative z-[2] my-auto w-full max-w-[620px]">
        {/* ragasztószalagok */}
        <span aria-hidden className="absolute -top-4 left-10 z-10 h-8 w-28 -rotate-6 bg-[#00ff9d]/70 shadow-sm" />
        <span aria-hidden className="absolute -top-3 right-12 z-10 h-8 w-24 rotate-[8deg] bg-white/60 shadow-sm" />

        <div
          className="relative overflow-hidden rounded-[6px] px-6 pb-7 pt-9 shadow-[0_40px_90px_rgba(0,0,0,0.45)] sm:px-12 sm:pb-8 sm:pt-10"
          style={{
            background: "#fffdf5",
            backgroundImage:
              "linear-gradient(90deg, transparent 52px, rgba(255,90,90,0.28) 52px, rgba(255,90,90,0.28) 54px, transparent 54px), repeating-linear-gradient(180deg, transparent 0 31px, rgba(0,120,200,0.12) 31px 32px)",
          }}
        >
          {/* pecsét */}
          <div aria-hidden className="rr-stamp absolute right-5 top-6 sm:right-8 sm:top-8" style={{ animationDelay: `${sigAt + 0.5}s` }}>
            <svg viewBox="0 0 100 100" className="h-16 w-16 sm:h-24 sm:w-24">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#00a866" strokeWidth="3" />
              <circle cx="50" cy="50" r="37" fill="none" stroke="#00a866" strokeWidth="1.2" />
              <defs>
                <path id="rr-stamp-arc" d="M50 50 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" />
              </defs>
              <text fontSize="8.5" fontWeight="800" letterSpacing="2.6" fill="#00a866">
                <textPath href="#rr-stamp-arc">ROUTER · TESOTTER · KAMION · 2026 ·</textPath>
              </text>
              <text x="50" y="47" textAnchor="middle" fontSize="11" fontWeight="900" fill="#00a866">KÖSZÖNJÜK</text>
              <text x="50" y="62" textAnchor="middle" fontSize="16" fill="#00a866">♥</text>
            </svg>
          </div>

          <div className="font-script pl-6 pr-2 text-[22px] leading-[32px] text-[#1a2a6c] sm:pl-8 sm:pr-24 sm:text-[23px]">
            {lines.map((l, i) => (
              <p key={i} id={i === 0 ? "rr-letter-title" : undefined} className={`rr-write ${i === 0 ? "mb-2 font-bold" : "mb-[12px]"} ${l.cls ?? ""}`} style={{ animationDelay: `${base + i * step}s` }}>
                {l.t}
              </p>
            ))}

            <div className="rr-write mt-4" style={{ animationDelay: `${sigAt}s`, animationDuration: "1.3s" }}>
              <div className="text-[30px] font-bold text-black sm:text-[34px]">Erick, Sebastian és Gergő</div>
              <svg aria-hidden viewBox="0 0 260 24" className="-mt-1 h-5 w-[230px]">
                <path d="M2 14 C 40 4, 70 22, 110 12 S 190 4, 258 10" fill="none" stroke="#00c97b" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="text-[21px] leading-7 text-[#1a2a6c]/75">a Tesotter tulajdonosai és az egész csapat</div>
            </div>
          </div>

          <div className="rr-up mt-7 flex flex-col items-stretch gap-4 pl-6 sm:flex-row sm:items-center sm:justify-between sm:pl-8" style={{ animationDelay: `${sigAt + 0.9}s` }}>
            <a href="mailto:sebastian.balog@tesotter.com?subject=routeR%20visszajelz%C3%A9s" className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black/50 underline decoration-[#00ff9d] decoration-2 underline-offset-4 hover:text-black sm:text-left">
              Írok nekik egy visszajelzést
            </a>
            <button onClick={close} className="btn-primary">
              Indulhat! →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
