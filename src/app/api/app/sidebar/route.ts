import { apiError, requireActive } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import type { SidebarData } from "@/lib/app-data";

/** a menü jelvényei: jóváhagyásra váró regisztrációk (admin) és az elmúlt 24 óra sofőr-megnyitásai */
export async function GET() {
  try {
    const u = await requireActive();
    const { User, DriverLink } = await getDb();
    const [pending, opened24h] = await Promise.all([
      u.role === "admin" ? User.countDocuments({ status: "pending" }) : Promise.resolve(0),
      DriverLink.countDocuments({ userId: u._id, lastOpenedAt: { $gte: new Date(Date.now() - 86400_000) } }),
    ]);
    const data: SidebarData = { pending, opened24h };
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
