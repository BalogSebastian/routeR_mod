"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/app/AuthShell";

export default function ResetPage() {
  const [token] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") ?? ""));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(j.error ?? "Hiba történt.");
      else setDone(true);
    } catch {
      setError("Hálózati hiba – próbáld újra.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Új jelszó" subtitle="Add meg az új jelszavad." footer={<Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">← Belépés</Link>}>
      {done ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">A jelszavad megváltozott. Most már beléphetsz.</div>
          <Link href="/login" className="btn-primary w-full !py-3">Belépés</Link>
        </div>
      ) : !token ? (
        <p className="text-sm text-slate-600">Hiányzó vagy hibás link. <Link href="/forgot" className="font-semibold text-violet-600">Kérj újat.</Link></p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">{error} {error.includes("lejárt") && <Link href="/forgot" className="font-semibold underline">Új link kérése</Link>}</p>}
          <label className="block"><span className="label-xs">Új jelszó</span>
            <input className="input-lg" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="legalább 8 karakter" /></label>
          <button className="btn-primary w-full !py-3" disabled={busy || password.length < 8}>{busy ? "Mentés…" : "Jelszó mentése"}</button>
        </form>
      )}
    </AuthShell>
  );
}
