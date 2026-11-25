/** a menü ikonjai és az eszközök listája (szerver- és kliensoldalon is használható) */

export const NAV_ICONS = {
  dash: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  plan: "M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM7 17c6 0 2-10 8-10",
  trips: "M4 6h16M4 12h16M4 18h10",
  fleet: "M2 7h12v9H2zM14 10h4.5L22 13.5V16h-8M6.5 19.5a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM17.5 19.5a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z",
  links: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  account: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  users: "M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a4 4 0 100-8 4 4 0 000 8zM21 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  quote: "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6M15 12.6a3 3 0 100 4.8M9 14h4.5M9 16h4.5",
  places: "M12 21s-7-6.2-7-12a7 7 0 1114 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  reports: "M4 20V11M10 20V4M16 20v-7M21 20H3",
  driving: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6.5V12l3.5 2",
  loading: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10",
  bans: "M8 2h8l6 6v8l-6 6H8l-6-6V8l6-6zM7.5 12h9",
  more: "M4 6h16M4 12h16M4 18h16",
};

export type NavItem = { href: string; label: string; icon: string; badge?: "pending" | "opens" };

/** a mindennapi munka eszközei */
export const TOOLS: (NavItem & { desc: string })[] = [
  { href: "/app/quote", label: "Árajánlat", icon: NAV_ICONS.quote, desc: "Mentett fuvarból PDF-ajánlat árréssel, ÁFA-val" },
  { href: "/app/places", label: "Helyeim", icon: NAV_ICONS.places, desc: "Ügyfelek, rakodóhelyek nyitvatartással" },
  { href: "/app/reports", label: "Kimutatás", icon: NAV_ICONS.reports, desc: "Költség járművenként, Excel-export" },
  { href: "/app/driving", label: "Vezetési idő", icon: NAV_ICONS.driving, desc: "Mennyit vezethet még, mikor ér oda" },
  { href: "/app/loading", label: "Rakodás", icon: NAV_ICONS.loading, desc: "Raklap-elrendezés, rakméter, tömeg" },
  { href: "/app/bans", label: "Kamionstop", icon: NAV_ICONS.bans, desc: "Hétvégi és ünnepnapi tilalmak" },
];
