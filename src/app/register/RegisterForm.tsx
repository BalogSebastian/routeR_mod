"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthShell from "@/components/app/AuthShell";

export default function RegisterForm({ current }: { current: { name: string; email: string } | null }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [f, setF] = useState({ name: "", email: "", company: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // a tesotter.com/routerget űrlapjáról érkező adatok előtöltése (a # után jönnek, szerverre nem kerülnek)
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (!h) return;
    const q = new URLSearchParams(h);
    const pick = (k: string) => (q.get(k) ?? "").slice(0, 200);
    requestAnimationFrame(() => setF((x) => ({ ...x, name: x.name || pick("name"), email: x.email || pick("email"), company: x.company || pick("company") })));
    // belépett állapotban a hash marad: kilépés + újratöltés után is előtöltve jön
    if (!current) history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [current]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, company: f.company || undefined }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? "Regisztráció sikertelen."); return; }
      // teljes oldalbetöltés: a friss munkamenet-sütivel indul az új oldal
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/wait";
    } catch {
      setError("Hálózati hiba – próbáld újra.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Fiók létrehozása"
      subtitle="A regisztrációdat elbíráljuk, és e-mailben értesítünk, hogy megadjuk-e a hozzáférést."
      footer={<>Van már fiókod? <Link href="/login" className="font-bold text-black underline decoration-[#00ff9d] decoration-[3px] underline-offset-4 transition hover:bg-[#00ff9d] hover:no-underline">Belépés</Link></>}
    >
      {current ? (
        <div className="space-y-5">
          <div className="border-l-4 border-[#00ff9d] bg-[#f4f4f1] p-4 text-sm leading-relaxed text-slate-600">
            Ebben a böngészőben jelenleg <b className="text-slate-800">{current.name}</b> (<b className="text-slate-800">{current.email}</b>) fiókjával vagy belépve.
            Új fiók létrehozásához előbb lépj ki.
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              className="btn-primary flex-1"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                // teljes újratöltés a hash-sel együtt: az előtöltött adatok megmaradnak
                window.location.reload();
              }}
            >
              {loggingOut ? "Kilépés…" : "Kilépés és új fiók"}
            </button>
            <a href="/app" className="flex-1 border-2 border-black px-5 py-3 text-center text-[13px] font-extrabold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white">
              Tovább a fiókomba
            </a>
          </div>
        </div>
      ) : (
      <form onSubmit={submit} className="space-y-6">
        {error && <p className="border-l-4 border-rose-500 bg-rose-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-700">{error}</p>}
        <label className="block"><span className="label-xs">Név</span>
          <input className="input-lg" required autoComplete="name" value={f.name} onChange={set("name")} placeholder="Kovács János" /></label>
        <label className="block"><span className="label-xs">E-mail</span>
          <input className="input-lg" type="email" required autoComplete="email" value={f.email} onChange={set("email")} placeholder="te@ceged.hu" /></label>
        <label className="block"><span className="label-xs">Cég <span className="normal-case tracking-normal text-slate-400">(nem kötelező)</span></span>
          <input className="input-lg" autoComplete="organization" value={f.company} onChange={set("company")} placeholder="Fuvarozó Kft." /></label>
        <label className="block"><span className="label-xs">Jelszó</span>
          <input className="input-lg" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} placeholder="legalább 8 karakter" /></label>
        <button className="btn-primary mt-2 w-full !py-4" disabled={busy || !f.name || !f.email || f.password.length < 8}>{busy ? "Létrehozás…" : "Regisztráció"}</button>
        <p className="text-[12.5px] leading-relaxed text-slate-500">A regisztráció után e-mailben visszaigazoljuk a kérésedet, majd az elbírálás után újra írunk: megkapod-e a hozzáférést.</p>
      </form>
      )}
    </AuthShell>
  );
}
