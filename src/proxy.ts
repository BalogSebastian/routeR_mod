import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session-cookie";

/**
 * Gyors előszűrés: süti nélkül az /app és /planner oldalak a belépőre irányítanak.
 * A tényleges (adatbázisos) ellenőrzés az oldalakban / API-kban történik.
 */
export function proxy(req: NextRequest) {
  const has = req.cookies.has(SESSION_COOKIE);
  const { pathname } = req.nextUrl;
  if (!has && (pathname.startsWith("/app") || pathname.startsWith("/planner"))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/planner/:path*"] };
