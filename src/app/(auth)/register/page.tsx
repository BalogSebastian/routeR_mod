"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/app/AuthShell";

export default function RegisterPage() {
  const [f, setF] = useState({ name: "", email: "", company: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
      subtitle="A regisztráció után jóváhagyjuk a hozzáférésedet."
      footer={<>Van már fiókod? <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">Belépés</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>}
        <label className="block"><span className="label-xs">Név</span>
          <input className="input-lg" required autoComplete="name" value={f.name} onChange={set("name")} placeholder="Kovács János" /></label>
        <label className="block"><span className="label-xs">E-mail</span>
          <input className="input-lg" type="email" required autoComplete="email" value={f.email} onChange={set("email")} placeholder="te@ceged.hu" /></label>
        <label className="block"><span className="label-xs">Cég <span className="normal-case tracking-normal text-slate-400">(nem kötelező)</span></span>
          <input className="input-lg" autoComplete="organization" value={f.company} onChange={set("company")} placeholder="Fuvarozó Kft." /></label>
        <label className="block"><span className="label-xs">Jelszó</span>
          <input className="input-lg" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} placeholder="legalább 8 karakter" /></label>
        <button className="btn-primary w-full !py-3" disabled={busy || !f.name || !f.email || f.password.length < 8}>{busy ? "Létrehozás…" : "Regisztráció"}</button>
      </form>
    </AuthShell>
  );
}
