import { z } from "zod";
import { apiError, checkPassword, dummyHash, startSession } from "@/lib/server/auth";
import { getDb } from "@/lib/server/models";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) });

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "Add meg az e-mail címed és a jelszavad." }, { status: 422 });
    const { email, password } = parsed.data;
    const [a, b] = await Promise.all([rateLimit(`login:ip:${clientIp(req)}`, 30, 900), rateLimit(`login:${email}`, 10, 900)]);
    if (!a.ok || !b.ok) return Response.json({ error: "Túl sok próbálkozás, várj néhány percet." }, { status: 429 });
    const { User } = await getDb();
    const user = await User.findOne({ email }).lean();
    const ok = await checkPassword(password, user?.passwordHash ?? (await dummyHash()));
    if (!user || !ok) return Response.json({ error: "Hibás e-mail cím vagy jelszó." }, { status: 401 });
    if (user.status === "blocked") return Response.json({ error: "A fiókod le van tiltva. Írj a tesotter.com-on." }, { status: 403 });
    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
    await startSession(user);
    return Response.json({ ok: true, status: user.status });
  } catch (e) {
    return apiError(e);
  }
}
