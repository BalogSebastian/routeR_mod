"use client";

import { useState } from "react";

export default function PasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: cur, next }) });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: "A jelszó megváltozott. A többi eszközön újra be kell lépned." } : { ok: false, text: j.error ?? "Hiba történt." });
    if (res.ok) { setCur(""); setNext(""); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block"><span className="label-xs">Jelenlegi jelszó</span><input className="input-lg" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></label>
      <label className="block"><span className="label-xs">Új jelszó</span><input className="input-lg" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required /></label>
      {msg && <p className={`border-l-4 px-3.5 py-2.5 text-[13px] font-medium ${msg.ok ? "border-[#00ff9d] bg-[#00ff9d]/10 text-black" : "border-rose-500 bg-rose-50 text-rose-700"}`}>{msg.text}</p>}
      <button className="btn-primary" disabled={busy || !cur || next.length < 8}>{busy ? "Mentés…" : "Jelszó módosítása"}</button>
    </form>
  );
}
