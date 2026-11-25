import { z } from "zod";
import { apiError, requireActive } from "@/lib/server/auth";
import { sendFeedback } from "@/lib/server/mail";
import { rateLimit } from "@/lib/server/ratelimit";

const body = z.object({
  topic: z.enum(["Kérdés", "Hibajelzés", "Ötlet", "Egyéb"]).default("Kérdés"),
  message: z.string().trim().min(3, "Írj pár szót.").max(4000, "Legfeljebb 4000 karakter."),
  page: z.string().max(200).optional(),
});

/** „Kérdésed van? Írj nekünk”: a levél a csapathoz megy, a válasz közvetlenül a felhasználónak */
export async function POST(req: Request) {
  try {
    const u = await requireActive();
    if (!(await rateLimit(`feedback:${u._id}`, 6, 3600)).ok) return Response.json({ error: "Túl sok üzenet egy órán belül, próbáld kicsit később." }, { status: 429 });
    const b = body.parse(await req.json().catch(() => ({})));
    const r = await sendFeedback({ name: u.name, email: u.email, company: u.company }, b.topic, b.message, b.page);
    return r.ok ? Response.json({ ok: true }) : Response.json({ error: "Az üzenetet most nem sikerült elküldeni. Írj a sebastian.balog@tesotter.com címre." }, { status: 502 });
  } catch (e) {
    return apiError(e);
  }
}
