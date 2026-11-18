import nodemailer from "nodemailer";

const site = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function transport() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
}

function shell(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#faf8ff;font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#231b3a">
<div style="max-width:520px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border:1px solid #ece8f7;border-radius:20px;padding:32px">
<div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#7c5cff;font-weight:700">routeR <span style="color:#a79bc9;font-weight:500">by tesotter</span></div>
<h1 style="font-size:20px;margin:18px 0 10px">${esc(title)}</h1><div style="font-size:14px;line-height:1.6;color:#4b4266">${body}</div>
${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:22px;background:#7c5cff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;font-size:14px">${esc(cta.label)}</a>` : ""}
</div></div></body></html>`;
}

async function send(to: string, subject: string, html: string) {
  const t = transport();
  if (!t) return;
  try {
    await t.sendMail({ from: `"routeR by tesotter" <${process.env.EMAIL_USER}>`, to, subject, html });
  } catch (e) {
    console.error("E-mail küldési hiba:", (e as Error).message);
  }
}

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
