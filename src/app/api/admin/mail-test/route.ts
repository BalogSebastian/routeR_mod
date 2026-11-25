import { apiError, requireAdmin } from "@/lib/server/auth";
import { mailChannel, sendTestMail } from "@/lib/server/mail";

/** admin: teszt-e-mail a saját címre; a küldés eredménye (vagy hibája) a válaszban */
export async function POST() {
  try {
    const admin = await requireAdmin();
    const r = await sendTestMail(admin.email);
    return Response.json({ ...r, to: admin.email, sender: mailChannel() });
  } catch (e) {
    return apiError(e);
  }
}
