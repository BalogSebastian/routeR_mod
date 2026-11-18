import { redirect } from "next/navigation";
import AuthShell from "@/components/app/AuthShell";
import LogoutButton from "@/components/app/LogoutButton";
import { getUser } from "@/lib/server/auth";

export const metadata = { title: "Jóváhagyásra vár – routeR by tesotter" };

export default async function WaitPage() {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.status === "active") redirect("/app");
  return (
    <AuthShell title="Köszönjük a regisztrációt" subtitle={`${u.name}, a fiókod jóváhagyásra vár.`}>
      <div className="space-y-4 text-sm leading-relaxed text-slate-600">
        <div className="flex items-start gap-3 rounded-2xl bg-violet-50 p-4">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">1</span>
          <p>Átnézzük a regisztrációdat, és <b className="text-slate-800">{u.email}</b> címre értesítést küldünk a jóváhagyásról.</p>
        </div>
        <p className="text-[13px] text-slate-500">Ha már jóváhagytuk, frissítsd az oldalt.</p>
        <div className="flex gap-2">
          <a href="/wait" className="btn-primary flex-1">Frissítés</a>
          <LogoutButton className="btn flex-1" />
        </div>
      </div>
    </AuthShell>
  );
}
