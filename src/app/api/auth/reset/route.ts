import { z } from "zod";
import { apiError, hashPassword, hashToken, passwordSchema } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

const schema = z.object({ token: z.string().min(20).max(100), password: passwordSchema });

export async function POST(req: Request) {
  try {
    const { token, password } = schema.parse(await req.json().catch(() => ({})));
    if (!(await rateLimit(`reset:${clientIp(req)}`, 20, 3600)).ok) return Response.json({ error: "Túl sok próbálkozás." }, { status: 429 });
    const { User, ResetToken } = await getDb();
    // egyszer használható: a törlés atomi, csak az első kérés kapja meg a tokent
    const t = await ResetToken.findOneAndDelete({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean();
    if (!t) return Response.json({ error: "A link érvénytelen vagy lejárt. Kérj újat." }, { status: 410 });
    // a régi munkamenetek érvénytelenek lesznek
    await User.updateOne({ _id: t.userId }, { $set: { passwordHash: await hashPassword(password) }, $inc: { sessionVersion: 1 } });
    await ResetToken.deleteMany({ userId: t.userId });
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
