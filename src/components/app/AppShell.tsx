"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, Wordmark } from "@/components/Brand";
import LogoutButton from "./LogoutButton";

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
    <div className="min-h-dvh bg-[#f6f4fd] md:flex">
      <aside className="app-side hidden w-[264px] shrink-0 flex-col px-4 py-6 text-white md:sticky md:top-0 md:flex md:h-dvh">
        <Link href="/app" className="flex items-center gap-2.5 px-2">
          <Logo className="h-9 w-9" />
          <span className="brand-word inline-flex items-baseline gap-2">
            <span className="text-[22px] leading-none text-white">route<b className="text-violet-300">R</b></span>
            <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-300/70">by tesotter</span>
          </span>
        </Link>
        <nav className="mt-10 space-y-1">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[14px] font-semibold transition ${active(n.href) ? "bg-white/[0.13] text-white shadow-inner shadow-white/10 ring-1 ring-white/15" : "text-violet-200/80 hover:bg-white/[0.07] hover:text-white"}`}>
              <Icon d={n.icon} />{n.label}
              {active(n.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-300" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.07] p-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 text-sm font-extrabold">{initials}</span>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold">{user.name}</div>
              <div className="truncate text-[11.5px] text-violet-200/70">{user.email}</div>
            </div>
          </div>
          <LogoutButton className="mt-3 w-full rounded-xl bg-white/10 py-2 text-xs font-bold text-violet-100 transition hover:bg-white/20" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobil felső sáv */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/app" className="flex items-center gap-2"><Logo className="h-8 w-8" /><Wordmark /></Link>
          <LogoutButton className="text-xs font-semibold text-violet-600" />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-10 md:py-10">{children}</main>
        <nav className="fixed inset-x-3 bottom-3 z-20 flex rounded-3xl border border-white/10 bg-[#1d1245]/95 p-1.5 shadow-2xl shadow-violet-950/40 backdrop-blur md:hidden">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition ${active(n.href) ? "bg-white/15 text-white" : "text-violet-300/80"}`}>
              <Icon d={n.icon} />{n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
