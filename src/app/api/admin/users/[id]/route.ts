import { z } from "zod";
import { ApiError, apiError, requireAdmin } from "@/lib/server/auth";
import { sendApproved, sendRejected } from "@/lib/server/mail";
import { getDb, isOid } from "@/lib/server/models";

const schema = z.object({ status: z.enum(["pending", "active", "blocked"]).optional(), role: z.enum(["user", "admin"]).optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (!isOid(id)) throw new ApiError(404, "Nincs ilyen felhasználó.");
    const input = schema.parse(await req.json().catch(() => ({})));
    if (String(admin._id) === id && (input.status && input.status !== "active" || input.role === "user")) throw new ApiError(409, "Saját magadat nem tilthatod le / fokozhatod vissza.");
    const { User } = await getDb();
    const before = await User.findById(id).lean();
    if (!before) throw new ApiError(404, "Nincs ilyen felhasználó.");
    const set: Record<string, unknown> = { ...input };
    if (input.status === "active" && before.status !== "active") set.approvedAt = new Date();
    const update: Record<string, unknown> = { $set: set };
    // tiltás / visszaminősítés: a meglévő munkamenetek érvénytelenek
    if (input.status === "blocked" || input.status === "pending" || input.role) update.$inc = { sessionVersion: 1 };
    await User.updateOne({ _id: id }, update);
    if (input.status === "active" && before.status !== "active") await sendApproved(before.email, before.name);
    // jóváhagyásra váró kérelem elutasítása: erről is szólunk
    if (input.status === "blocked" && before.status === "pending") await sendRejected(before.email, before.name);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (!isOid(id)) throw new ApiError(404, "Nincs ilyen felhasználó.");
    if (String(admin._id) === id) throw new ApiError(409, "Saját fiókodat nem törölheted.");
    const { User, Trip, Settings } = await getDb();
    await Promise.all([User.deleteOne({ _id: id }), Trip.deleteMany({ userId: id }), Settings.deleteOne({ userId: id })]);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
