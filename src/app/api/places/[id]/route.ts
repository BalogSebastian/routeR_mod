import { apiError, requireActive } from "@/lib/server/auth";
import { getDb, isOid } from "@/lib/server/models";
import { placeBody, toPlaceItem } from "@/lib/server/places";

type Ctx = { params: Promise<{ id: string }> };

/** szerkesztés; { used: true } esetén csak a használat számlálója nő (a tervezőből választva) */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const u = await requireActive();
    const { id } = await params;
    if (!isOid(id)) return Response.json({ error: "Nincs ilyen hely." }, { status: 404 });
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { Place } = await getDb();
    if (body.used === true) {
      await Place.updateOne({ _id: id, userId: u._id }, { $inc: { uses: 1 }, $set: { lastUsedAt: new Date() } });
      return Response.json({ ok: true });
    }
    const b = placeBody.parse(body);
    const p = await Place.findOneAndUpdate({ _id: id, userId: u._id }, { $set: b }, { returnDocument: "after" }).lean();
    return p ? Response.json({ place: toPlaceItem(p) }) : Response.json({ error: "Nincs ilyen hely." }, { status: 404 });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const u = await requireActive();
    const { id } = await params;
    if (!isOid(id)) return Response.json({ error: "Nincs ilyen hely." }, { status: 404 });
    const { Place } = await getDb();
    await Place.deleteOne({ _id: id, userId: u._id });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
