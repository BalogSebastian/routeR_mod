/** az /app felület közös típusai és segédei (kliens és szerver is használja) */

/** a sofőr-link azonosítója: a böngésző generálja, a link hash-ében utazik (#d=…&l=<id>) */
export const LINK_ID = /^[A-Za-z0-9_-]{12,32}$/;

export interface DriverLinkItem {
  id: string; tripName: string; from: string; to: string; km: number; dep?: string; arr?: string;
  driver?: string; channel?: string; sentAt: string; opens: number; firstOpenedAt?: string; lastOpenedAt?: string; d: string;
}

export interface SidebarData { pending: number; opened24h: number }

export const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp", viber: "Viber", email: "E-mail", sms: "SMS", copy: "Másolva", share: "Megosztva", qr: "QR-kód", open: "Megnyitva",
};

export function newLinkId(): string {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* ---------- Helyeim ---------- */

export type PlaceKind = "depot" | "customer" | "loading" | "parking" | "service" | "other";
export interface PlaceItem {
  id: string; name: string; kind: PlaceKind; label: string; lat: number; lon: number; cc?: string;
  hours?: string; contact?: string; phone?: string; notes?: string; uses: number; lastUsedAt?: string; updatedAt: string;
}
export const PLACE_KINDS: { k: PlaceKind; l: string; icon: string }[] = [
  { k: "depot", l: "Telephely", icon: "🏠" },
  { k: "customer", l: "Ügyfél", icon: "🤝" },
  { k: "loading", l: "Rakodóhely", icon: "📦" },
  { k: "parking", l: "Parkoló", icon: "🅿️" },
  { k: "service", l: "Szerviz / tankolás", icon: "🔧" },
  { k: "other", l: "Egyéb", icon: "📍" },
];
export const placeIcon = (k: PlaceKind) => PLACE_KINDS.find((x) => x.k === k)?.icon ?? "📍";

/** ékezet- és kisbetű-független keresés */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** a tervezőbe a meglévő megosztási formátummal (#s=…) visz át; 2+ pontnál azonnal számol */
export function plannerUrl(w: { lat: number; lon: number; label: string }[]): string {
  return `/planner#s=${btoa(encodeURIComponent(JSON.stringify({ w })))}`;
}
