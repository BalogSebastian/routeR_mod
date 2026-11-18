"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/app/AuthShell";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(j.error ?? "Hiba történt.");
      else setSent(true);
    } catch {
      setError("Hálózati hiba – próbáld újra.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Elfelejtett jelszó"
      subtitle="Küldünk egy linket, amivel újat adhatsz meg."
      footer={<Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">← Vissza a belépéshez</Link>}
    >
      {sent ? (
        <div className="rounded-2xl bg-violet-50 p-4 text-sm leading-relaxed text-slate-600">
          Ha a <b className="text-slate-800">{email}</b> cím regisztrálva van, a linket elküldtük. A levél pár percen belül megérkezik (nézd meg a spam mappát is), a link 1 óráig érvényes.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>}
          <label className="block"><span className="label-xs">E-mail</span>
            <input className="input-lg" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="te@ceged.hu" /></label>
          <button className="btn-primary w-full !py-3" disabled={busy || !email}>{busy ? "Küldés…" : "Link küldése"}</button>
        </form>
      )}
    </AuthShell>
  );
}
