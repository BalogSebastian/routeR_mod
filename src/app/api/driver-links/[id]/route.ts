import { z } from "zod";
import { apiError, requireActive } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { LINK_ID } from "@/lib/app-data";

type Ctx = { params: Promise<{ id: string }> };

/** a sofőr nevének / megjegyzésének módosítása */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const u = await requireActive();
    const { id } = await params;
    if (!LINK_ID.test(id)) return Response.json({ error: "Nincs ilyen link." }, { status: 404 });
    const { driver } = z.object({ driver: z.string().trim().max(80) }).parse(await req.json().catch(() => ({})));
    const { DriverLink } = await getDb();
    const r = await DriverLink.updateOne({ _id: id, userId: u._id }, { $set: { driver } });
    return r.matchedCount ? Response.json({ ok: true }) : Response.json({ error: "Nincs ilyen link." }, { status: 404 });
  } catch (e) {
    return apiError(e);
  }
}

/** törlés a listából (a sofőrnél a link ettől még működik, csak nem követjük tovább) */
export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const u = await requireActive();
    const { id } = await params;
    const { DriverLink } = await getDb();
    await DriverLink.deleteOne({ _id: id, userId: u._id });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
