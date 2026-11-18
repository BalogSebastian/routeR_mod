import { z } from "zod";
import { apiError, requireActive } from "@/lib/server/auth";
import { getDb, isOid } from "@/lib/server/models";
import { tripSchema } from "@/lib/server/trip-schema";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  try {
    const u = await requireActive();
    const { id } = await params;
    if (!isOid(id)) return Response.json({ error: "Nincs ilyen fuvar." }, { status: 404 });
    const { Trip } = await getDb();
    const t = await Trip.findOne({ _id: id, userId: u._id }).lean();
    return t ? Response.json({ trip: t }) : Response.json({ error: "Nincs ilyen fuvar." }, { status: 404 });
  } catch (e) {
    return apiError(e);
  }
}

/** átnevezés vagy teljes frissítés (újramentés a tervezőből) */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const u = await requireActive();
    const { id } = await params;
    if (!isOid(id)) return Response.json({ error: "Nincs ilyen fuvar." }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const keys = Object.keys(body);
    const patch = keys.length === 1 && keys[0] === "name" ? z.object({ name: z.string().trim().min(1).max(120) }).parse(body)
      : keys.length === 1 && keys[0] === "favorite" ? z.object({ favorite: z.boolean() }).parse(body)
      : tripSchema.parse(body);
    const { Trip } = await getDb();
    const r = await Trip.updateOne({ _id: id, userId: u._id }, { $set: patch });
    return r.matchedCount ? Response.json({ ok: true }) : Response.json({ error: "Nincs ilyen fuvar." }, { status: 404 });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const u = await requireActive();
    const { id } = await params;
    if (!isOid(id)) return Response.json({ error: "Nincs ilyen fuvar." }, { status: 404 });
    const { Trip } = await getDb();
    await Trip.deleteOne({ _id: id, userId: u._id });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
