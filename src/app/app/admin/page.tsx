import { redirect } from "next/navigation";
import AdminUsers, { type AdminUser } from "@/components/app/AdminUsers";
import { getUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";

export const metadata = { title: "Felhasználók" };

export default async function AdminPage() {
  const me = (await getUser())!;
  if (me.role !== "admin") redirect("/app");
  const { User, Trip } = await getDb();
  const [users, counts] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(500).select("-passwordHash").lean(),
    Trip.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
  ]);
  const by = new Map(counts.map((c) => [String(c._id), c.n]));
  const initial: AdminUser[] = users.map((u) => ({
    id: String(u._id), name: u.name, email: u.email, company: u.company, role: u.role, status: u.status,
    createdAt: new Date(u.createdAt).toISOString(), lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined, trips: by.get(String(u._id)) ?? 0,
  }));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Regisztrációk jóváhagyása és jogosultságok</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Felhasználók</h1>
      </div>
      <AdminUsers initial={initial} me={String(me._id)} />
    </div>
  );
}
