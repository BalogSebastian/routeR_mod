/**
 * Microsoft Graph levélküldés ellenőrzése, élesítés előtt.
 * Futtatás:  npm run mail:check -- cimzett@pelda.hu
 * Lépések: beállítások → token → küldés. Minden lépésnél kiírja, mi a hiba és mit kell javítani.
 */
import { GraphMailError, graphConfig, sendViaGraph } from "../src/lib/server/graph-mail";

const c = graphConfig();
if (!c) {
  const miss = ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "MAIL_FROM"].filter((k) => !process.env[k]?.trim());
  console.error(`✗ Hiányzik a .env.local-ból: ${miss.join(", ")}`);
  process.exit(1);
}
const to = process.argv[2] || c.from;
console.log(`• Tenant:  ${c.tenant}\n• App:     ${c.clientId}\n• Feladó:  ${c.fromName} <${c.from}>\n• Címzett: ${to}\n`);
try {
  await sendViaGraph(c, {
    to,
    subject: "[routeR] Graph levélküldés teszt",
    html: `<p>Ez egy teszt-levél: a routeR a Microsoft Graph-on keresztül, <b>${c.from}</b> nevében küld.</p><p>Küldve: ${new Date().toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}</p>`,
  });
  console.log("✓ Elküldve (Graph 202). Nézd meg a beérkezett és a levélszemét mappát, illetve a feladó Elküldött elemeit.");
} catch (e) {
  console.error(`✗ ${e instanceof GraphMailError ? e.message : (e as Error).message}`);
  process.exit(1);
}
