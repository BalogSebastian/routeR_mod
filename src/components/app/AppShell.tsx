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
  return (
    <div className="min-h-dvh bg-slate-50 md:flex">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex md:h-dvh md:sticky md:top-0">
        <Link href="/app" className="flex items-center gap-2.5 px-2"><Logo className="h-9 w-9" /><Wordmark /></Link>
        <nav className="mt-9 space-y-1">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active(n.href) ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-100"}`}>
              <Icon d={n.icon} />{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-slate-50 p-3.5">
          <div className="truncate text-sm font-semibold text-slate-800">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
          <LogoutButton className="mt-3 text-xs font-semibold text-violet-600 hover:text-violet-800" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobil felső sáv */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/app" className="flex items-center gap-2"><Logo className="h-8 w-8" /><Wordmark /></Link>
          <LogoutButton className="text-xs font-semibold text-violet-600" />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-10 md:py-10">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active(n.href) ? "text-violet-700" : "text-slate-500"}`}>
              <Icon d={n.icon} />{n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
