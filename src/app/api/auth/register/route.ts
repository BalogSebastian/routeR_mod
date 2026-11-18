import { z } from "zod";
import { apiError, hashPassword, passwordSchema, startSession } from "@/lib/server/auth";
import { notifyAdminNewUser } from "@/lib/server/mail";
import { getDb } from "@/lib/server/models";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

const schema = z.object({
  name: z.string().trim().min(2, "Add meg a neved.").max(80),
  email: z.string().trim().toLowerCase().email("Érvénytelen e-mail cím.").max(160),
  password: passwordSchema,
  company: z.string().trim().max(120).optional(),
});

export async function POST(req: Request) {
  try {
    const input = schema.parse(await req.json().catch(() => ({})));
    const rl = await rateLimit(`reg:${clientIp(req)}`, 6, 3600);
    if (!rl.ok) return Response.json({ error: "Túl sok regisztrációs kísérlet, próbáld később." }, { status: 429 });
    const { User } = await getDb();
    if (await User.exists({ email: input.email })) return Response.json({ error: "Ezzel az e-mail címmel már van fiók." }, { status: 409 });
    const user = await User.create({
      name: input.name, email: input.email, company: input.company || undefined,
      passwordHash: await hashPassword(input.password), role: "user", status: "pending",
    });
    await startSession(user.toObject());
    await notifyAdminNewUser({ name: input.name, email: input.email, company: input.company });
    return Response.json({ ok: true, status: "pending" });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return Response.json({ error: "Ezzel az e-mail címmel már van fiók." }, { status: 409 });
    return apiError(e);
  }
}
