import { apiError, requireAdmin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export async function GET() {
  try {
    await requireAdmin();
    const { User, Trip } = await getDb();
    const users = await User.find().sort({ createdAt: -1 }).limit(500).select("-passwordHash").lean();
    const counts = await Trip.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$userId", n: { $sum: 1 } } }]);
    const byUser = new Map(counts.map((c) => [String(c._id), c.n]));
    // ugyanaz az alak, mint az admin oldal kezdeti listája (AdminUser)
    return Response.json({
      users: users.map((u) => ({
        id: String(u._id), name: u.name, email: u.email, company: u.company, role: u.role, status: u.status,
        createdAt: new Date(u.createdAt).toISOString(), lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined,
        trips: byUser.get(String(u._id)) ?? 0,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
