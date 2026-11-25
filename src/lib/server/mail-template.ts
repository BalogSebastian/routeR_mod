/**
 * A routeR felhasználóknak szóló leveleinek közös, látványos sablonja (ugyanaz a stílus, mint a tesotter.com
 * routeR köszönőlevele): mozgó routeR-fejléc, sötét címsáv, fehér kártya, Balog Sebastian Máté aláírása.
 * A képek a tesotter.com-on vannak (public/email/*), a generálásuk: tesotterdev/scripts/router-mail/.
 */

const ASSETS = "https://www.tesotter.com/email";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** a megszólításhoz: magyar névsorrendnél a második tag a keresztnév („Balog Sebastian” → „Sebastian”) */
export function firstName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length >= 2 ? parts[1] : parts[0];
}

export interface RouterMail {
  preheader: string;
  kicker: string;
  /** nagy, fehér cím (pl. „Jóváhagyva, Sebastian.”) */
  title: string;
  /** zöld alcím a cím alatt */
  accent: string;
  /** a fehér kártya bekezdései (HTML, a hívó felel az escape-ért) */
  paragraphs: string[];
  /** fekete, zöld szegélyes kiemelés */
  callout?: { label: string; html: string };
  steps?: { t: string; d: string }[];
  cta?: { href: string; label: string };
  /** apró sor a gomb alatt (HTML) */
  afterCta?: string;
  /** a levél alján: Balog Sebastian Máté aláírása */
  signed?: boolean;
  /** lábléc magyarázat: miért kapta a levelet */
  why: string;
}

const MONO = "font-family:'SFMono-Regular',Menlo,Consolas,monospace";
const SANS = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function routerMailHtml(m: RouterMail): string {
  const steps = m.steps?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-bottom:2px solid #000">${m.steps
        .map(
          (s, i) => `<tr><td style="padding:14px 0;border-top:2px solid #000">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="44" valign="top"><div style="width:30px;height:30px;line-height:30px;text-align:center;background:#000;color:#00FF9D;${MONO};font-size:13px;font-weight:700">${i + 1}</div></td>
          <td valign="top" style="${SANS}"><div style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:-0.01em;color:#000">${s.t}</div>
            <div style="font-size:14px;line-height:1.55;color:#555;margin-top:3px">${s.d}</div></td>
        </tr></table></td></tr>`,
        )
        .join("")}</table>`
    : "";
  const callout = m.callout
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;border-left:6px solid #00FF9D;margin-top:6px"><tr><td style="padding:18px 22px">
      <div style="${MONO};font-size:10px;font-weight:700;letter-spacing:0.3em;color:#00FF9D">${m.callout.label}</div>
      <div style="margin-top:6px;font-size:15px;line-height:1.55;color:#ffffff">${m.callout.html}</div></td></tr></table>`
    : "";
  const cta = m.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 8px"><tr>
      <td style="background:#00FF9D;border:2px solid #000"><a href="${m.cta.href}" style="display:inline-block;padding:16px 26px;${SANS};font-size:13px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:#000;text-decoration:none">${m.cta.label} &nbsp;&rarr;</a></td>
      <td width="8" style="background:#000"></td></tr><tr><td colspan="2" style="height:8px;background:#000;font-size:0;line-height:0">&nbsp;</td></tr></table>
      ${m.afterCta ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#777">${m.afterCta}</p>` : ""}`
    : "";
  const sign = m.signed
    ? `<tr><td class="px" style="background:#ffffff;padding:10px 44px 40px;${SANS};color:#111">
      <p style="margin:0;font-size:16px;line-height:1.6">Ha bármi kérdésed van, csak válaszolj erre a levélre, személyesen olvasom.</p>
      <p style="margin:14px 0 0;font-size:16px">Üdvözlettel,</p>
      <img src="${ASSETS}/router-signature.png" width="250" alt="Balog Sebastian Máté" style="display:block;width:250px;height:auto;border:0;margin:6px 0 2px -4px">
      <div style="border-top:2px solid #000;padding-top:10px;width:260px">
        <div style="font-size:14px;font-weight:900;text-transform:uppercase">Balog Sebastian Máté</div>
        <div style="${MONO};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#666;margin-top:3px">Co-founder &amp; CTO · Tesotter</div>
        <div style="font-size:13px;margin-top:6px"><a href="mailto:sebastian.balog@tesotter.com" style="color:#000">sebastian.balog@tesotter.com</a></div>
      </div></td></tr>`
    : `<tr><td style="background:#ffffff;height:30px;font-size:0;line-height:0">&nbsp;</td></tr>`;

  return `<!DOCTYPE html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(m.preheader)}</title>
<style>
  @keyframes rp { 0%,100% { box-shadow: 0 0 0 0 rgba(0,255,157,.7) } 70% { box-shadow: 0 0 0 9px rgba(0,255,157,0) } }
  @keyframes rl { from { width: 0 } to { width: 120px } }
  .pulse { animation: rp 2.2s ease-out infinite }
  .line { animation: rl 1.4s cubic-bezier(.16,1,.3,1) .3s both }
  @media (max-width: 620px) { .px { padding-left: 22px !important; padding-right: 22px !important } .h1 { font-size: 34px !important } }
</style></head>
<body style="margin:0;padding:0;background:#050505">
<div style="display:none;max-height:0;overflow:hidden">${esc(m.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505"><tr><td align="center" style="padding:28px 12px 36px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
  <tr><td style="background:#050505;line-height:0"><img src="${ASSETS}/router-hero.gif" width="600" alt="routeR by tesotter – kamion-útvonaltervező" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>
  <tr><td class="px" style="background:#050505;padding:34px 44px 38px;${SANS}">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td><div class="pulse" style="width:8px;height:8px;border-radius:8px;background:#00FF9D"></div></td>
      <td style="padding-left:12px;${MONO};font-size:11px;font-weight:700;letter-spacing:0.35em;text-transform:uppercase;color:#00FF9D">${m.kicker}</td>
    </tr></table>
    <div class="h1" style="margin-top:22px;font-size:42px;line-height:0.95;font-weight:900;letter-spacing:-0.04em;text-transform:uppercase;color:#ffffff">${m.title}</div>
    <div style="margin-top:10px;font-size:24px;line-height:1.05;font-weight:900;letter-spacing:-0.03em;text-transform:uppercase;color:#00FF9D">${m.accent}</div>
    <div class="line" style="margin-top:22px;height:3px;width:120px;background:#00FF9D"></div>
  </td></tr>
  <tr><td class="px" style="background:#ffffff;padding:40px 44px 20px;${SANS};color:#111">
    ${m.paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.65">${p}</p>`).join("")}
    ${callout}${steps}${cta}
  </td></tr>
  ${sign}
  <tr><td class="px" style="background:#050505;padding:22px 44px;${SANS}">
    <div style="${MONO};font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.5)">route<span style="background:#00FF9D;color:#000;padding:0 3px">R</span> by tesotter &nbsp;·&nbsp; <a href="https://www.tesotter.com/features/router" style="color:rgba(255,255,255,0.5)">www.tesotter.com</a></div>
    <div style="margin-top:10px;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.4)">${m.why} M&amp;B Corporation (Tesotter) · Bank Center, Szabadság tér 7., 1054 Budapest</div>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

export { esc };
