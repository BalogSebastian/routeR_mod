import { apiError, requireAdmin } from "@/lib/server/auth";
import { sendTestMail } from "@/lib/server/mail";

/** admin: teszt-e-mail a saját címre; a küldés eredménye (vagy hibája) a válaszban */
export async function POST() {
  try {
    const admin = await requireAdmin();
    const r = await sendTestMail(admin.email);
    return Response.json({ ...r, to: admin.email, sender: (process.env.EMAIL_USER ?? "").replace(/(.).+(@.+)/, "$1***$2") });
  } catch (e) {
    return apiError(e);
  }
}
