/**
 * Első admin létrehozása / felhasználó előléptetése és aktiválása.
 * Használat: npx tsx --env-file=.env.local scripts/make-admin.mts valaki@ceg.hu
 * (előbb regisztrálj az oldalon, ez a parancs aktiválja és adminná teszi a fiókot)
 */
import mongoose from "mongoose";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) { console.error("Add meg az e-mail címet."); process.exit(1); }
const uri = process.env.ROUTER_MONGODB_URI ?? process.env.MONGODB_URI;
if (!uri) { console.error("ROUTER_MONGODB_URI hiányzik."); process.exit(1); }
const c = await mongoose.createConnection(uri, { dbName: process.env.ROUTER_DB_NAME || "routeR", serverSelectionTimeoutMS: 8000 }).asPromise();
const r = await c.collection("users").updateOne({ email }, { $set: { role: "admin", status: "active", approvedAt: new Date() }, $inc: { sessionVersion: 1 } });
console.log(r.matchedCount ? `✓ ${email}: admin + aktív` : `✗ Nincs ilyen felhasználó: ${email} (előbb regisztrálj)`);
await c.close();
