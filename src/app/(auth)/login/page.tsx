"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/app/AuthShell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? "Belépés sikertelen."); return; }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = j.status === "active" ? (next && next.startsWith("/") && !next.startsWith("//") ? next : "/app") : "/wait";
    } catch {
      setError("Hálózati hiba – próbáld újra.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Üdv újra"
      subtitle="Jelentkezz be a routeR-be."
      footer={<>Még nincs fiókod? <Link href="/register" className="font-bold text-black underline decoration-[#00ff9d] decoration-[3px] underline-offset-4 transition hover:bg-[#00ff9d] hover:no-underline">Regisztráció</Link></>}
    >
      <form onSubmit={submit} className="space-y-6">
        {error && <p className="border-l-4 border-rose-500 bg-rose-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-700">{error}</p>}
        <label className="block">
          <span className="label-xs">E-mail</span>
          <input className="input-lg" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="te@ceged.hu" />
        </label>
        <label className="block">
          <span className="label-xs flex items-center justify-between"><span>Jelszó</span><Link href="/forgot" className="normal-case tracking-normal font-sans text-[12px] font-semibold text-black/55 underline decoration-[#00ff9d] decoration-2 underline-offset-4 hover:text-black">Elfelejtetted?</Link></span>
          <input className="input-lg" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
        <button className="btn-primary mt-2 w-full !py-4" disabled={busy || !email || !password}>{busy ? "Belépés…" : "Belépés"}</button>
      </form>
    </AuthShell>
  );
}
