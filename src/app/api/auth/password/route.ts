import { z } from "zod";
import { apiError, checkPassword, hashPassword, passwordSchema, requireActive, startSession } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { rateLimit } from "@/lib/server/ratelimit";

const schema = z.object({ current: z.string().min(1).max(128), next: passwordSchema });

export async function POST(req: Request) {
  try {
    const u = await requireActive();
    const { current, next } = schema.parse(await req.json().catch(() => ({})));
    if (!(await rateLimit(`pw:${u._id}`, 8, 900)).ok) return Response.json({ error: "Túl sok próbálkozás, várj néhány percet." }, { status: 429 });
    if (!(await checkPassword(current, u.passwordHash))) return Response.json({ error: "A jelenlegi jelszó hibás." }, { status: 403 });
    const { User } = await getDb();
    // a többi munkamenet érvénytelen lesz, ez az eszköz bent marad
    const updated = await User.findByIdAndUpdate(u._id, { $set: { passwordHash: await hashPassword(next) }, $inc: { sessionVersion: 1 } }, { returnDocument: "after" }).lean();
    if (updated) await startSession(updated);
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
