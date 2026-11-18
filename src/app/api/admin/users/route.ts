import { apiError, requireAdmin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export async function GET() {
  try {
    await requireAdmin();
    const { User, Trip } = await getDb();
    const users = await User.find().sort({ createdAt: -1 }).limit(500).select("-passwordHash").lean();
    const counts = await Trip.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$userId", n: { $sum: 1 } } }]);
    const byUser = new Map(counts.map((c) => [String(c._id), c.n]));
    return Response.json({ users: users.map((u) => ({ ...u, trips: byUser.get(String(u._id)) ?? 0 })) });
  } catch (e) {
    return apiError(e);
  }
}
