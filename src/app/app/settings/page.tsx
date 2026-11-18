import PasswordForm from "@/components/app/PasswordForm";
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
      <div>
        <p className="text-sm text-slate-500">Adataid és biztonság</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Fiók</h1>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Profil</h2>
        <dl className="divide-y divide-slate-100 text-sm">
          {rows.map(([k, v]) => (<div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>))}
        </dl>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Jelszó módosítása</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
