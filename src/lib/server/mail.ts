import nodemailer from "nodemailer";
import { getDb } from "./models";

/** az e-mailekben lévő linkek alapcíme: mindig a publikus cím, soha nem localhost */
const PUBLIC_URL = "https://router-by-tesotter.vercel.app";
const site = () => {
  const v = (process.env.SITE_URL ?? "").trim().replace(/\/$/, "");
  return /^https:\/\//.test(v) && !/localhost|127\.0\.0\.1/.test(v) ? v : PUBLIC_URL;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Küldő postafiók. EMAIL_HOST nélkül Gmail (régi beállítás); a tesotter.com-os címhez
 * Microsoft 365: EMAIL_HOST=smtp.office365.com, EMAIL_PORT=587 (STARTTLS).
 */
function transport() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  const host = process.env.EMAIL_HOST?.trim();
  if (!host) return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  const port = Number(process.env.EMAIL_PORT) || 587;
  return nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port !== 465, auth: { user, pass } });
}

function shell(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#faf8ff;font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#231b3a">
<div style="max-width:520px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border:1px solid #ece8f7;border-radius:20px;padding:32px">
<div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#7c5cff;font-weight:700">routeR <span style="color:#a79bc9;font-weight:500">by tesotter</span></div>
<h1 style="font-size:20px;margin:18px 0 10px">${esc(title)}</h1><div style="font-size:14px;line-height:1.6;color:#4b4266">${body}</div>
${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:22px;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;font-size:14px">${esc(cta.label)}</a>` : ""}
</div></div></body></html>`;
}

export interface SendResult { ok: boolean; error?: string; accepted?: string[]; response?: string }

async function log(to: string, subject: string, r: SendResult) {
  try {
    const { MailLog } = await getDb();
    await MailLog.create({ to, subject, ok: r.ok, error: r.error, response: r.response });
  } catch { /* a naplózás hibája ne akassza meg a küldést */ }
}

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const t = transport();
  let res: SendResult;
  if (!t) res = { ok: false, error: "Az EMAIL_USER / EMAIL_PASS nincs beállítva a szerveren." };
  else {
    try {
      const r = await t.sendMail({ from: `"routeR by tesotter" <${process.env.EMAIL_USER}>`, to, subject, html });
      res = r.accepted?.length
        ? { ok: true, accepted: r.accepted as string[], response: r.response }
        : { ok: false, error: `A levelet a szerver nem fogadta el: ${r.rejected?.join(", ") ?? "ismeretlen ok"}`, response: r.response };
    } catch (e) {
      console.error("E-mail küldési hiba:", (e as Error).message);
      res = { ok: false, error: (e as Error).message };
    }
  }
  await log(to, subject, res);
  return res;
}

/** admin: teszt-levél a saját címre (a hibaüzenet visszajön) */
export const sendTestMail = (to: string) =>
  send(to, "[routeR] E-mail teszt", shell("Az e-mail küldés működik", "Ez egy teszt-levél a routeR e-mail beállításának ellenőrzéséhez. Ha ezt olvasod, a jelszó-visszaállító és az értesítő levelek is ki tudnak menni."));

/** új regisztráció: értesítés az adminnak */
export async function notifyAdminNewUser(u: { name: string; email: string; company?: string }) {
  const to = process.env.ROUTER_ADMIN_NOTIFY || process.env.EMAIL_USER;
  if (!to) return;
  await send(to, `[routeR] Új regisztráció jóváhagyásra vár – ${u.name}`, shell(
    "Új regisztráció jóváhagyásra vár",
    `<b>${esc(u.name)}</b> (${esc(u.email)})${u.company ? `<br/>Cég: ${esc(u.company)}` : ""}`,
    { href: `${site()}/app/admin`, label: "Megnyitás az admin felületen" },
  ));
}

/** jóváhagyás után: értesítés a felhasználónak */
export async function sendApproved(to: string, name: string) {
  await send(to, "[routeR] A hozzáférésed aktiválva", shell(
    "Hozzáférés aktiválva",
    `Szia ${esc(name)}! A fiókodat jóváhagytuk, mostantól használhatod a routeR kamion-útvonaltervezőt.`,
    { href: `${site()}/login`, label: "Belépés" },
  ));
}

/** regisztráció után: visszaigazolás a felhasználónak, hogy elbíráljuk a kérését */
export async function sendRegistrationReceived(to: string, name: string) {
  await send(to, "[routeR] Megkaptuk a regisztrációdat", shell(
    "Megkaptuk a regisztrációdat",
    `Szia ${esc(name)}! Köszönjük, hogy regisztráltál a routeR-be. A kérésedet hamarosan elbíráljuk, és <b>e-mailben értesítünk</b>, hogy megadjuk-e a hozzáférést.`,
  ));
}

/** elutasítás (függő fiók tiltása): értesítés a felhasználónak */
export async function sendRejected(to: string, name: string) {
  await send(to, "[routeR] A hozzáférési kérelmedről", shell(
    "A hozzáférési kérelmedről",
    `Szia ${esc(name)}! Köszönjük az érdeklődésed a routeR iránt. A regisztrációdat átnéztük, de most nem tudunk hozzáférést adni. Ha kérdésed van, válaszolj erre a levélre, vagy írj nekünk a tesotter.com oldalon.`,
  ));
}

/** jelszó-visszaállító link (1 óráig érvényes, egyszer használható) */
export async function sendPasswordReset(to: string, name: string, token: string) {
  await send(to, "[routeR] Jelszó visszaállítása", shell(
    "Jelszó visszaállítása",
    `Szia ${esc(name)}! Jelszó-visszaállítást kértél a routeR fiókodhoz. A link <b>1 óráig</b> érvényes és csak egyszer használható.<br/><br/>Ha nem te kérted, nyugodtan hagyd figyelmen kívül ezt a levelet.`,
    { href: `${site()}/reset?token=${token}`, label: "Új jelszó megadása" },
  ));
}
