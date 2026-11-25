/** az /app felület közös típusai és segédei (kliens és szerver is használja) */

/** a sofőr-link azonosítója: a böngésző generálja, a link hash-ében utazik (#d=…&l=<id>) */
export const LINK_ID = /^[A-Za-z0-9_-]{12,32}$/;

export interface DriverLinkItem {
  id: string; tripName: string; from: string; to: string; km: number; dep?: string; arr?: string;
  driver?: string; channel?: string; sentAt: string; opens: number; firstOpenedAt?: string; lastOpenedAt?: string; d: string;
}

export interface MonthStat { n: number; km: number; toll: number; eur: number }
export interface SidebarData { month: MonthStat; prev: MonthStat; pending: number; opened24h: number }

export const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp", viber: "Viber", email: "E-mail", sms: "SMS", copy: "Másolva", share: "Megosztva", qr: "QR-kód", open: "Megnyitva",
};

export function newLinkId(): string {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
