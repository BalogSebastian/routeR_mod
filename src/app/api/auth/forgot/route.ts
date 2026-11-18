import { randomBytes } from "node:crypto";
import { z } from "zod";
import { apiError, hashToken } from "@/lib/server/auth";
import { sendPasswordReset } from "@/lib/server/mail";
import { getDb } from "@/lib/server/models";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

/** mindig ugyanazt válaszolja (nem derül ki, hogy létezik-e a fiók) */
export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "Érvénytelen e-mail cím." }, { status: 422 });
    const { email } = parsed.data;
    const [a, b] = await Promise.all([rateLimit(`forgot:ip:${clientIp(req)}`, 10, 3600), rateLimit(`forgot:${email}`, 3, 3600)]);
    if (!a.ok || !b.ok) return Response.json({ error: "Túl sok kérés, próbáld később." }, { status: 429 });
    const { User, ResetToken } = await getDb();
    const user = await User.findOne({ email }).lean();
    if (user && user.status !== "blocked") {
      const token = randomBytes(32).toString("base64url");
      await ResetToken.deleteMany({ userId: user._id });
      await ResetToken.create({ userId: user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) });
      await sendPasswordReset(user.email, user.name, token);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
