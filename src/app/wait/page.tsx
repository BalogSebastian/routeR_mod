import { redirect } from "next/navigation";
import AuthShell from "@/components/app/AuthShell";
import LogoutButton from "@/components/app/LogoutButton";
import WelcomeLetter from "@/components/app/WelcomeLetter";
import { getUser } from "@/lib/server/auth";

export const metadata = { title: "Jóváhagyásra vár – routeR by tesotter" };

export default async function WaitPage() {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.status === "active") redirect("/app");
  return (
    <AuthShell title="Köszönjük a regisztrációt" subtitle={`${u.name}, a fiókod jóváhagyásra vár.`}>
      <WelcomeLetter name={u.name} email={u.email} pending />
      <div className="space-y-4 text-sm leading-relaxed text-slate-600">
        <div className="flex items-start gap-3 border-l-4 border-[#00ff9d] bg-[#f4f4f1] p-4">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-[#00ff9d]">1</span>
          <p>Átnézzük a regisztrációdat, és <b className="text-slate-800">{u.email}</b> címre értesítést küldünk a jóváhagyásról.</p>
        </div>
        <p className="text-[13px] text-slate-500">Ha már jóváhagytuk, frissítsd az oldalt.</p>
        <div className="flex flex-col gap-4 pt-2 sm:flex-row">
          <a href="/wait" className="btn-primary flex-1">Frissítés</a>
          <LogoutButton className="flex-1 border-2 border-black px-5 py-3 text-[13px] font-extrabold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white" />
        </div>
      </div>
    </AuthShell>
  );
}
