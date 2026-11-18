import mongoose from "mongoose";

interface Cache { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null }
const g = globalThis as unknown as { __routerDb?: Cache };
const cache: Cache = (g.__routerDb ??= { conn: null, promise: null });

/** Külön kapcsolat és adatbázis (ROUTER_DB_NAME): a routeR kollekciói elszigetelve vannak a többi Tesotter-adattól. */
export async function connect(): Promise<mongoose.Connection> {
  if (cache.conn && cache.conn.readyState === 1) return cache.conn;
  const uri = process.env.ROUTER_MONGODB_URI ?? process.env.MONGODB_URI;
  if (!uri) throw new Error("ROUTER_MONGODB_URI szükséges.");
  if (!cache.promise) {
    const conn = mongoose.createConnection(uri, {
      dbName: process.env.ROUTER_DB_NAME || "routeR",
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    cache.promise = conn.asPromise().then((c) => (cache.conn = c));
    cache.promise.catch(() => { cache.promise = null; cache.conn = null; });
  }
  return cache.promise;
}
