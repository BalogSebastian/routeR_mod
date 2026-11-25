import nodemailer from "nodemailer";
import { graphConfig, sendViaGraph } from "./graph-mail";
import { firstName, routerMailHtml } from "./mail-template";
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

/** melyik csatornán megy ki a levél (admin felületen / tesztben kiírható) */
export function mailChannel(): string {
  const g = graphConfig();
  if (g) return `Microsoft Graph (${g.from})`;
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) return `SMTP (${process.env.EMAIL_HOST?.trim() || "gmail"}, ${process.env.EMAIL_USER})`;
  return "nincs beállítva";
}

async function send(to: string, subject: string, html: string, fromName?: string): Promise<SendResult> {
  let res: SendResult;
  const g = graphConfig();
  if (g) {
    // Microsoft 365 / Graph: elsődleges csatorna, ha be van állítva
    try {
      const r = await sendViaGraph(fromName ? { ...g, fromName } : g, { to, subject, html });
      res = { ok: true, accepted: [to], response: `Graph ${r.status} (${g.from})` };
    } catch (e) {
      console.error("Graph e-mail küldési hiba:", (e as Error).message);
      res = { ok: false, error: (e as Error).message };
    }
    await log(to, subject, res);
    return res;
  }
  const t = transport();
  if (!t) res = { ok: false, error: "Nincs beállítva levélküldés a szerveren (MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET / MAIL_FROM, vagy EMAIL_USER / EMAIL_PASS)." };
  else {
    try {
      const r = await t.sendMail({ from: `"${fromName ?? "routeR by tesotter"}" <${process.env.EMAIL_USER}>`, to, subject, html });
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
  const to = process.env.ROUTER_ADMIN_NOTIFY || process.env.MAIL_FROM || process.env.EMAIL_USER;
  if (!to) return;
  await send(to, `[routeR] Új regisztráció jóváhagyásra vár – ${u.name}`, shell(
    "Új regisztráció jóváhagyásra vár",
    `<b>${esc(u.name)}</b> (${esc(u.email)})${u.company ? `<br/>Cég: ${esc(u.company)}` : ""}`,
    { href: `${site()}/app/admin`, label: "Megnyitás az admin felületen" },
  ));
}

/** az aláírt levelek feladóneve */
const SEBASTIAN = "Balog Sebastian Máté · routeR";

/** jóváhagyás után: értesítés a felhasználónak (látványos routeR-levél, belépő gombbal) */
export async function sendApproved(to: string, name: string) {
  await send(to, "Jóváhagytuk a routeR-hozzáférésedet", routerMailHtml({
    preheader: "Jóváhagytuk a hozzáférésedet: mostantól beléphetsz a routeR-be és tervezheted az első fuvarodat.",
    kicker: "Hozzáférés · jóváhagyva",
    title: `Jóváhagyva,<br>${esc(firstName(name))}.`,
    accent: "Indulhat az első fuvar.",
    paragraphs: [
      `Kedves ${esc(name)}!`,
      "Örömmel írom, hogy a <b>routeR</b>-hozzáférésedet jóváhagytuk. Mostantól a saját fiókodban tervezheted a fuvarjaidat: kamionra szabott útvonal, útdíj 27 országban, komp és vasút, pihenők és valós érkezési idő, egy helyen.",
    ],
    callout: { label: "JÓ MUNKÁT KÍVÁNUNK", html: "Köszönjük a bizalmat. Reméljük, a routeR sok időt és pénzt spórol neked, és <b style=\"color:#00FF9D\">szerencsés utakat</b> kívánunk minden fuvarodhoz!" },
    steps: [
      { t: "Lépj be", d: "Az e-mail-címeddel és a regisztrációkor megadott jelszavaddal." },
      { t: "Add meg a kamionodat", d: "Az Új útvonal oldalon a jármű-kártyán: méret, tömeg, tengelyek, EURO-norma, ADR." },
      { t: "Tervezd meg az első fuvart", d: "Útdíjjal, menetrenddel és teljes költséggel, majd küldd el a sofőrnek egy linkben." },
    ],
    cta: { href: `${site()}/login`, label: "Belépés a routeR-be" },
    afterCta: `Elfelejtetted a jelszavad? <a href="${site()}/forgot" style="color:#000">Új jelszót itt kérhetsz.</a>`,
    signed: true,
    why: "Ezt a levelet azért kaptad, mert regisztráltál a routeR-be, és jóváhagytuk a hozzáférésedet.",
  }), SEBASTIAN);
}

/** regisztráció után: visszaigazolás a felhasználónak, hogy elbíráljuk a kérését */
export async function sendRegistrationReceived(to: string, name: string) {
  await send(to, "Megkaptuk a routeR-regisztrációdat", routerMailHtml({
    preheader: "Megkaptuk a regisztrációdat: rövid időn belül elbíráljuk, és e-mailben megírjuk a döntést.",
    kicker: "Regisztráció · megérkezett",
    title: `Megkaptuk,<br>${esc(firstName(name))}.`,
    accent: "Hamarosan jelentkezünk.",
    paragraphs: [
      `Kedves ${esc(name)}!`,
      "Köszönjük, hogy regisztráltál a <b>routeR</b>-be. A fiókod létrejött, most már csak a jóváhagyásunk hiányzik.",
    ],
    callout: { label: "MI TÖRTÉNIK MOST?", html: "A regisztrációdat <b style=\"color:#00FF9D\">rövid időn belül elbíráljuk</b>, és e-mailben megírjuk, megadjuk-e a hozzáférést." },
    signed: true,
    why: "Ezt a levelet azért kaptad, mert regisztráltál a routeR-be. Ha nem te voltál, nyugodtan hagyd figyelmen kívül.",
  }), SEBASTIAN);
}

/** elutasítás (függő fiók tiltása): értesítés a felhasználónak */
export async function sendRejected(to: string, name: string) {
  await send(to, "A routeR-hozzáférési kérelmedről", routerMailHtml({
    preheader: "Átnéztük a routeR-regisztrációdat.",
    kicker: "Hozzáférés · elbírálva",
    title: `Köszönjük,<br>${esc(firstName(name))}.`,
    accent: "Most nem tudunk hozzáférést adni.",
    paragraphs: [
      `Kedves ${esc(name)}!`,
      "Köszönjük az érdeklődésedet a <b>routeR</b> iránt. A regisztrációdat átnéztük, de most sajnos nem tudunk hozzáférést adni.",
      "Ha úgy gondolod, hogy tévedés történt, vagy szeretnéd elmondani, mire használnád a routeR-t, válaszolj erre a levélre, és újra átnézzük.",
    ],
    signed: true,
    why: "Ezt a levelet azért kaptad, mert regisztráltál a routeR-be.",
  }), SEBASTIAN);
}

/** jelszó-visszaállító link (1 óráig érvényes, egyszer használható) */
export async function sendPasswordReset(to: string, name: string, token: string) {
  await send(to, "routeR jelszó visszaállítása", routerMailHtml({
    preheader: "Jelszó-visszaállítást kértél a routeR-fiókodhoz. A link 1 óráig érvényes.",
    kicker: "Fiók · új jelszó",
    title: "Új jelszó",
    accent: "1 óráig érvényes link.",
    paragraphs: [
      `Kedves ${esc(name)}!`,
      "Jelszó-visszaállítást kértél a routeR-fiókodhoz. Az alábbi gombbal adhatsz meg új jelszót. A link <b>1 óráig</b> érvényes, és csak egyszer használható.",
    ],
    cta: { href: `${site()}/reset?token=${token}`, label: "Új jelszó megadása" },
    afterCta: "Ha nem te kérted, nyugodtan hagyd figyelmen kívül ezt a levelet: a jelszavad nem változik.",
    why: "Ezt a levelet azért kaptad, mert a routeR-ben jelszó-visszaállítást kértek ehhez a címhez.",
  }));
}
