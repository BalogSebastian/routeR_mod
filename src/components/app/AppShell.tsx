"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, Wordmark } from "@/components/Brand";
import LogoutButton from "./LogoutButton";
import RouteNet from "./RouteNet";
import WelcomeLetter, { openWelcomeLetter } from "./WelcomeLetter";

const NAV = [
  { href: "/app", label: "Irányítópult", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/planner", label: "Új útvonal", icon: "M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM7 17c6 0 2-10 8-10" },
  { href: "/app/trips", label: "Fuvaraim", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/app/settings", label: "Fiók", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6" },
];
const ADMIN = { href: "/app/admin", label: "Felhasználók", icon: "M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a4 4 0 100-8 4 4 0 000 8zM21 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" };

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

export default function AppShell({ user, children }: { user: { name: string; email: string; admin: boolean }; children: React.ReactNode }) {
  const path = usePathname();
  const items = user.admin ? [...NAV, ADMIN] : NAV;
  const active = (h: string) => (h === "/app" ? path === "/app" : path.startsWith(h));
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-dvh bg-[#f4f4f1] md:flex">
      <WelcomeLetter name={user.name} email={user.email} />
      <aside className="app-side relative hidden w-[264px] shrink-0 flex-col overflow-hidden px-4 py-6 text-white md:sticky md:top-0 md:flex md:h-dvh">
        <RouteNet id="side" dim={0.35} />
        <Link href="/app" className="relative z-10 flex items-center gap-2.5 px-2">
          <Logo className="h-9 w-9" />
          <span className="brand-word inline-flex items-baseline gap-2">
            <span className="text-[22px] leading-none text-white">route<b className="text-[#00ff9d]">R</b></span>
            <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">by tesotter</span>
          </span>
        </Link>
        <div className="relative z-10 mt-10 mb-3 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Menü</div>
        <nav className="relative z-10 space-y-1">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={`group flex items-center gap-3 px-3.5 py-3 text-[12.5px] font-extrabold uppercase tracking-[0.12em] transition ${active(n.href) ? "bg-[#00ff9d] text-black shadow-[4px_4px_0_0_#fff]" : "text-white/60 hover:translate-x-1 hover:bg-white/[0.06] hover:text-white"}`}>
              <Icon d={n.icon} />{n.label}
              {active(n.href) && <span className="ml-auto font-mono text-[13px]">→</span>}
            </Link>
          ))}
        </nav>

        {/* a köszönőlevél: bárki bármikor újra elolvashatja */}
        <button onClick={openWelcomeLetter} aria-label="Köszönőlevél megnyitása" className="group relative z-10 mx-auto mt-auto mb-6 block w-[208px] text-left [@media(max-height:740px)]:hidden">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 transition group-hover:text-[#00ff9d]">Levél neked ✉</span>
          <span className="rr-card-in mt-3 block" style={{ animationDelay: "0.6s" }}>
            <span className="relative block -rotate-3 transition duration-500 ease-[cubic-bezier(0.2,0.8,0.3,1.4)] group-hover:-translate-y-2 group-hover:rotate-1 group-hover:scale-105">
              <span aria-hidden className="absolute -top-2 left-5 z-10 h-4 w-16 -rotate-6 bg-[#00ff9d]/75" />
              <span aria-hidden className="absolute -top-1.5 right-6 z-10 h-4 w-12 rotate-[9deg] bg-white/50" />
              <span
                className="font-script relative block overflow-hidden rounded-[3px] px-4 pb-3 pt-4 text-[#1a2a6c] shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition group-hover:shadow-[0_22px_50px_rgba(0,255,157,0.25)]"
                style={{ background: "#fffdf5", backgroundImage: "linear-gradient(90deg, transparent 18px, rgba(255,90,90,0.28) 18px, rgba(255,90,90,0.28) 19px, transparent 19px), repeating-linear-gradient(180deg, transparent 0 19px, rgba(0,120,200,0.12) 19px 20px)" }}
              >
                <span className="block pl-3 text-[19px] font-bold leading-5 text-black">Kedves {user.name.split(" ")[0]}!</span>
                <span className="mt-1 block pl-3 text-[15px] leading-5">Köszönjük, hogy a routeR-t választottad…</span>
                <span className="mt-1.5 block pl-3 text-[15px] font-bold leading-5 text-black">Erick, Sebastian és Gergő</span>
                <svg aria-hidden viewBox="0 0 100 100" className="absolute -bottom-1 -right-1 h-12 w-12 -rotate-12 opacity-80">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#00a866" strokeWidth="4" />
                  <text x="50" y="56" textAnchor="middle" fontSize="20" fill="#00a866">♥</text>
                </svg>
              </span>
            </span>
          </span>
          <span className="mt-3 block text-center font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 transition group-hover:text-[#00ff9d]">Kattints és olvasd el →</span>
        </button>

        <div className="relative z-10 border border-white/15 bg-black/60 p-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#00ff9d] font-mono text-sm font-black text-black">{initials}</span>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold">{user.name}</div>
              <div className="truncate text-[11.5px] text-white/45">{user.email}</div>
            </div>
          </div>
          <LogoutButton className="mt-3 w-full border border-white/20 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/75 transition hover:border-[#00ff9d] hover:bg-[#00ff9d] hover:text-black" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobil felső sáv */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-black bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/app" className="flex items-center gap-2"><Logo className="h-8 w-8" /><Wordmark /></Link>
          <span className="flex items-center gap-4">
            <button onClick={openWelcomeLetter} aria-label="Köszönőlevél megnyitása" className="flex h-8 w-8 items-center justify-center bg-[#00ff9d] text-[15px] shadow-[3px_3px_0_0_#000]">✉</button>
            <LogoutButton className="border-b-2 border-[#00ff9d] font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-black" />
          </span>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-10 md:py-10">{children}</main>
        <nav className="fixed inset-x-3 bottom-3 z-20 flex border-2 border-black bg-[#0a0a0a]/95 p-1.5 shadow-[5px_5px_0_0_#00ff9d] backdrop-blur md:hidden">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[9.5px] font-bold uppercase tracking-wide transition ${active(n.href) ? "bg-[#00ff9d] text-black" : "text-white/55"}`}>
              <Icon d={n.icon} />{n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
