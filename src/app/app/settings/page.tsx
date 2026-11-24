import PasswordForm from "@/components/app/PasswordForm";
import { PageHead } from "@/components/app/RouteNet";
import { getUser } from "@/lib/server/auth";

export const metadata = { title: "Fiók" };

export default async function SettingsPage() {
  const u = (await getUser())!;
  const rows = [
    ["Név", u.name], ["E-mail", u.email], ["Cég", u.company || "–"], ["Jogosultság", u.role === "admin" ? "Adminisztrátor" : "Felhasználó"],
    ["Regisztráció", new Date(u.createdAt).toLocaleDateString("hu-HU")],
  ];
  return (
    <div className="max-w-2xl space-y-8">
      <PageHead kicker="Adataid és biztonság" title="Fiók" />
      <section className="border-2 border-black bg-white p-6">
        <h2 className="mb-4 text-[15px] font-black uppercase tracking-tight text-black">Profil</h2>
        <dl className="divide-y divide-black/10 border-y border-black/10 text-sm">
          {rows.map(([k, v]) => (<div key={k} className="flex justify-between gap-4 py-3"><dt className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-black/45">{k}</dt><dd className="text-right font-semibold text-black">{v}</dd></div>))}
        </dl>
      </section>
      <section className="border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#00ff9d]">
        <h2 className="mb-5 text-[15px] font-black uppercase tracking-tight text-black">Jelszó módosítása</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
