/**
 * Levélküldés Microsoft Graph-fal (Microsoft 365, tesotter.com), jelszó nélkül.
 *
 * Egy Entra-alkalmazás client-credentials tokennel küld a MAIL_FROM postafiók nevében
 * (POST /users/{MAIL_FROM}/sendMail). Az alkalmazás jogát az Exchange "RBAC for Applications"
 * szűkíti EGYETLEN postafiókra, így a titok kiszivárgása esetén sem küldhet más nevében.
 *
 * Környezeti változók:
 *   MS_TENANT_ID      – Entra tenant (címtár) azonosító
 *   MS_CLIENT_ID      – az alkalmazás (ügyfél) azonosítója
 *   MS_CLIENT_SECRET  – titkos ügyfélkulcs (értéke, nem az azonosítója)
 *   MAIL_FROM         – küldő postafiók, pl. sebastian.balog@tesotter.com
 *   MAIL_FROM_NAME    – opcionális megjelenített név (alapból: "routeR by tesotter")
 */

export interface GraphConfig { tenant: string; clientId: string; secret: string; from: string; fromName: string }

export function graphConfig(): GraphConfig | null {
  const tenant = process.env.MS_TENANT_ID?.trim();
  const clientId = process.env.MS_CLIENT_ID?.trim();
  const secret = process.env.MS_CLIENT_SECRET?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!tenant || !clientId || !secret || !from) return null;
  return { tenant, clientId, secret, from, fromName: process.env.MAIL_FROM_NAME?.trim() || "routeR by tesotter" };
}

/* ───────── token (folyamaton belül gyorsítótárazva, lejárat előtt 5 perccel frissítve) ───────── */

let cached: { key: string; token: string; exp: number } | null = null;
let inflight: Promise<string> | null = null;

async function token(c: GraphConfig): Promise<string> {
  const key = `${c.tenant}|${c.clientId}`;
  if (cached && cached.key === key && Date.now() < cached.exp) return cached.token;
  inflight ??= (async () => {
    try {
      const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(c.tenant)}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: c.clientId, client_secret: c.secret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
        signal: AbortSignal.timeout(15_000),
      });
      const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
      if (!res.ok || !j.access_token) throw new GraphMailError(tokenHint(j.error, j.error_description), res.status);
      cached = { key, token: j.access_token, exp: Date.now() + Math.max(60, (j.expires_in ?? 3600) - 300) * 1000 };
      return j.access_token;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** az Entra hibakódjából érthető magyar üzenet */
function tokenHint(code?: string, desc?: string): string {
  const d = desc?.split("\r\n")[0] ?? "";
  if (/AADSTS7000215/.test(d)) return "Hibás MS_CLIENT_SECRET: a titok ÉRTÉKÉT kell megadni, nem az azonosítóját (Secret ID).";
  if (/AADSTS7000222/.test(d)) return "Az MS_CLIENT_SECRET lejárt: készíts újat az Entra-alkalmazásnál.";
  if (/AADSTS700016/.test(d)) return "Az MS_CLIENT_ID nem található ebben a tenantban.";
  if (/AADSTS90002|AADSTS900023/.test(d)) return "Hibás MS_TENANT_ID.";
  return `Microsoft-bejelentkezési hiba (${code ?? "ismeretlen"}): ${d || "nincs részlet"}`;
}

export class GraphMailError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/* ───────── küldés ───────── */

export interface MailInput { to: string; subject: string; html: string; replyTo?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** elküldi a levelet; siker esetén a Graph 202-t ad. Átmeneti hibáknál (429, 5xx, hálózat) legfeljebb 2× újrapróbál. */
export async function sendViaGraph(c: GraphConfig, m: MailInput): Promise<{ status: number }> {
  const body = JSON.stringify({
    message: {
      subject: m.subject,
      body: { contentType: "HTML", content: m.html },
      toRecipients: [{ emailAddress: { address: m.to } }],
      from: { emailAddress: { address: c.from, name: c.fromName } },
      ...(m.replyTo ? { replyTo: [{ emailAddress: { address: m.replyTo } }] } : {}),
    },
    // az elküldött levelek látszanak a postafiók „Elküldött elemek” mappájában
    saveToSentItems: true,
  });
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(c.from)}/sendMail`;

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${await token(c)}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      if (e instanceof GraphMailError) throw e;
      if (attempt < 2) { await sleep(800 * (attempt + 1)); continue; }
      throw new GraphMailError(`Hálózati hiba a Microsoft Graph felé: ${(e as Error).message}`);
    }
    if (res.status === 202) return { status: 202 };
    // lejárt / visszavont token: egyszer újrakérjük
    if (res.status === 401 && attempt === 0) { cached = null; continue; }
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 10) * 1000 : 1000 * (attempt + 1));
      continue;
    }
    const j = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    throw new GraphMailError(sendHint(res.status, j.error?.code, j.error?.message, c.from), res.status);
  }
}

function sendHint(status: number, code = "", msg = "", from: string): string {
  if (status === 403 || code === "ErrorAccessDenied")
    return `Az alkalmazásnak nincs joga ${from} nevében küldeni. Ellenőrizd az Exchange "Application Mail.Send" szerepkör-hozzárendelést (Test-ServicePrincipalAuthorization).`;
  if (status === 404 || code === "ErrorInvalidUser" || code === "MailboxNotEnabledForRESTAPI")
    return `A MAIL_FROM postafiók (${from}) nem található vagy nincs Exchange Online licence.`;
  if (code === "ErrorInvalidRecipients") return "Érvénytelen címzett.";
  return `Microsoft Graph hiba (${status}${code ? ", " + code : ""}): ${msg || "nincs részlet"}`;
}
