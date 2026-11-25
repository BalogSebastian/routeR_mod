"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SidebarData } from "@/lib/app-data";
import FeedbackDialog, { openFeedback } from "./FeedbackDialog";
import { BanWatch, MonthPanel, QuickTrip, useSidebarData } from "./SideWidgets";
import { Logo, Wordmark } from "@/components/Brand";
import LogoutButton from "./LogoutButton";
import RouteNet from "./RouteNet";
import WelcomeLetter, { openWelcomeLetter } from "./WelcomeLetter";

export const NAV_ICONS = {
  dash: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  plan: "M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM7 17c6 0 2-10 8-10",
  trips: "M4 6h16M4 12h16M4 18h10",
  fleet: "M2 7h12v9H2zM14 10h4.5L22 13.5V16h-8M6.5 19.5a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM17.5 19.5a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z",
  links: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  account: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  users: "M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a4 4 0 100-8 4 4 0 000 8zM21 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  more: "M4 6h16M4 12h16M4 18h16",
};

type NavItem = { href: string; label: string; icon: string; badge?: "pending" | "opens" };
const NAV: NavItem[] = [
  { href: "/app", label: "Irányítópult", icon: NAV_ICONS.dash },
  { href: "/planner", label: "Új útvonal", icon: NAV_ICONS.plan },
  { href: "/app/trips", label: "Fuvaraim", icon: NAV_ICONS.trips },
  { href: "/app/vehicles", label: "Járműveim", icon: NAV_ICONS.fleet },
  { href: "/app/drivers", label: "Sofőr-linkek", icon: NAV_ICONS.links, badge: "opens" },
  { href: "/app/settings", label: "Fiók", icon: NAV_ICONS.account },
];
const ADMIN: NavItem = { href: "/app/admin", label: "Felhasználók", icon: NAV_ICONS.users, badge: "pending" };
/** mobilon az alsó sávban ezek, a többi a „Több” lapon */
const MOBILE_MAIN = ["/app", "/planner", "/app/trips"];

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

function Badge({ item, data, dark = true }: { item: NavItem; data: SidebarData | null; dark?: boolean }) {
  if (!item.badge || !data) return null;
  const n = item.badge === "pending" ? data.pending : data.opened24h;
  if (!n) return null;
  const title = item.badge === "pending" ? `${n} regisztráció vár jóváhagyásra` : `${n} link megnyitva az elmúlt 24 órában`;
  return (
    <span title={title} className={`relative ml-auto inline-flex h-[19px] min-w-[19px] items-center justify-center px-1 font-mono text-[10.5px] font-black ${item.badge === "pending" ? "bg-rose-500 text-white" : dark ? "bg-[#00ff9d] text-black" : "bg-black text-[#00ff9d]"}`}>
      {item.badge === "pending" && <span aria-hidden className="absolute inset-0 animate-ping bg-rose-500/60" />}
      <span className="relative">{n}</span>
    </span>
  );
}

function Account({ user }: { user: ShellUser }) {
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative z-10 border border-white/15 bg-black/60 p-3.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center bg-[#00ff9d] font-mono text-sm font-black text-black">
          {initials}
          <span aria-hidden className="absolute -bottom-1 -right-1 h-3 w-3 border-2 border-[#0b0b0b] bg-[#00ff9d]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold" title={user.name}>{user.name}</div>
          <div className="truncate text-[11.5px] text-white/45" title={user.email}>{user.company ? `${user.company} · ${user.email}` : user.email}</div>
        </div>
      </div>
      <button onClick={openFeedback} className="group mt-3 flex w-full items-center justify-between gap-2 border border-[#00ff9d]/35 bg-[#00ff9d]/[0.06] px-3 py-2.5 text-left text-[12px] font-semibold text-white/80 transition hover:border-[#00ff9d] hover:bg-[#00ff9d] hover:text-black">
        <span>Kérdésed van? <b className="text-[#00ff9d] transition group-hover:text-black">Írj nekünk</b></span>
        <span className="font-mono transition group-hover:translate-x-0.5">→</span>
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={openWelcomeLetter} className="flex items-center justify-center gap-1.5 border border-white/15 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/60 transition hover:border-white/50 hover:text-white">
          ✉ Levél
        </button>
        <LogoutButton className="flex items-center justify-center gap-1.5 border border-white/15 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/60 transition hover:border-rose-400 hover:text-rose-300">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          Kilépés
        </LogoutButton>
      </div>
    </div>
  );
}

interface ShellUser { name: string; email: string; company?: string; admin: boolean }

export default function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const path = usePathname();
  const data = useSidebarData();
  const [more, setMore] = useState(false);
  const items = user.admin ? [...NAV, ADMIN] : NAV;
  const active = (h: string) => (h === "/app" ? path === "/app" : path.startsWith(h));
  const extra = items.filter((n) => !MOBILE_MAIN.includes(n.href));
  const extraBadge = (data?.pending ?? 0) + (data?.opened24h ?? 0);
  useEffect(() => {
    if (!more) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [more]);

  return (
    <div className="min-h-dvh bg-[#f4f4f1] md:flex">
      <WelcomeLetter name={user.name} email={user.email} />
      <FeedbackDialog email={user.email} />
      <aside className="app-side no-scrollbar relative hidden w-[264px] shrink-0 flex-col overflow-y-auto overflow-x-hidden px-4 py-6 text-white md:sticky md:top-0 md:flex md:h-dvh">
        <RouteNet id="side" dim={0.35} />
        <Link href="/app" className="relative z-10 flex items-center gap-2.5 px-2">
          <Logo className="h-9 w-9" />
          <span className="brand-word inline-flex items-baseline gap-2">
            <span className="text-[22px] leading-none text-white">route<b className="text-[#00ff9d]">R</b></span>
            <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">by tesotter</span>
          </span>
        </Link>
        <div className="relative z-10 mt-9 mb-3 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Menü</div>
        <nav className="relative z-10 space-y-0.5">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={`group flex items-center gap-3 px-3.5 py-[11px] text-[12.5px] font-extrabold uppercase tracking-[0.12em] transition ${active(n.href) ? "bg-[#00ff9d] text-black shadow-[4px_4px_0_0_#fff]" : "text-white/60 hover:translate-x-1 hover:bg-white/[0.06] hover:text-white"}`}>
              <Icon d={n.icon} />{n.label}
              <Badge item={n} data={data} dark={!active(n.href)} />
              {active(n.href) && !(n.badge && data && (n.badge === "pending" ? data.pending : data.opened24h)) && <span className="ml-auto font-mono text-[13px]">→</span>}
            </Link>
          ))}
        </nav>

        <div className="relative z-10 mt-7 space-y-3">
          <QuickTrip />
          <MonthPanel data={data} />
          <BanWatch />
        </div>

        {/* a köszönőlevél-kártya csak magas képernyőn fér el; egyébként a fiók-blokk ✉ gombjával nyílik */}
        <button onClick={openWelcomeLetter} aria-label="Köszönőlevél megnyitása" className="group relative z-10 mx-auto mt-8 hidden w-[208px] text-left [@media(min-height:1240px)]:block">
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
        </button>

        <div className="mt-auto pt-6">
          <Account user={user} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobil felső sáv */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-black bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/app" className="flex items-center gap-2"><Logo className="h-8 w-8" /><Wordmark /></Link>
          <span className="flex items-center gap-3">
            <button onClick={openFeedback} aria-label="Írj nekünk" className="flex h-8 w-8 items-center justify-center border-2 border-black text-[14px]">?</button>
            <button onClick={openWelcomeLetter} aria-label="Köszönőlevél megnyitása" className="flex h-8 w-8 items-center justify-center bg-[#00ff9d] text-[15px] shadow-[3px_3px_0_0_#000]">✉</button>
          </span>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-10 md:py-10">{children}</main>
        <nav className="fixed inset-x-3 bottom-3 z-30 flex border-2 border-black bg-[#0a0a0a]/95 p-1.5 shadow-[5px_5px_0_0_#00ff9d] backdrop-blur md:hidden">
          {items.filter((n) => MOBILE_MAIN.includes(n.href)).map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMore(false)} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[9.5px] font-bold uppercase tracking-wide transition ${active(n.href) ? "bg-[#00ff9d] text-black" : "text-white/55"}`}>
              <Icon d={n.icon} />{n.label}
            </Link>
          ))}
          <button onClick={() => setMore((v) => !v)} aria-expanded={more} className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-[9.5px] font-bold uppercase tracking-wide transition ${more || extra.some((n) => active(n.href)) ? "bg-[#00ff9d] text-black" : "text-white/55"}`}>
            <Icon d={more ? "M6 6l12 12M18 6L6 18" : NAV_ICONS.more} />Több
            {extraBadge > 0 && !more && <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-rose-500" />}
          </button>
        </nav>

        {/* mobil „Több” lap: a többi menüpont, gyors fuvar, e havi számok, kamionstop, fiók */}
        {more && (
          <div className="fixed inset-0 z-20 md:hidden" role="dialog" aria-modal aria-label="Menü">
            <button aria-label="Bezárás" className="absolute inset-0 bg-black/50" onClick={() => setMore(false)} />
            <div className="app-side rr-up no-scrollbar absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto px-4 pb-28 pt-5 text-white" style={{ animationDuration: "0.35s" }}>
              <div className="mx-auto mb-4 h-1 w-10 bg-white/20" />
              <nav className="grid grid-cols-2 gap-2">
                {extra.map((n) => (
                  <Link key={n.href} href={n.href} onClick={() => setMore(false)} className={`flex items-center gap-2.5 border px-3 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] ${active(n.href) ? "border-[#00ff9d] bg-[#00ff9d] text-black" : "border-white/12 text-white/80"}`}>
                    <Icon d={n.icon} /><span className="truncate">{n.label}</span>
                    <Badge item={n} data={data} dark={!active(n.href)} />
                  </Link>
                ))}
              </nav>
              <div className="mt-4 space-y-3">
                <QuickTrip onGo={() => setMore(false)} />
                <div className="grid gap-3 sm:grid-cols-2" onClick={() => setMore(false)}>
                  <MonthPanel data={data} />
                  <BanWatch />
                </div>
                <Account user={user} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
