"use client";

import { useState } from "react";

export interface AdminUser { id: string; name: string; email: string; company?: string; role: "user" | "admin"; status: "pending" | "active" | "blocked"; createdAt: string; lastLoginAt?: string; trips: number }

const BADGE = { pending: "bg-amber-100 text-amber-800", active: "bg-emerald-100 text-emerald-800", blocked: "bg-rose-100 text-rose-800" };
const LABEL = { pending: "Jóváhagyásra vár", active: "Aktív", blocked: "Tiltva" };

export default function AdminUsers({ initial, me }: { initial: AdminUser[]; me: string }) {
  const [users, setUsers] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const patch = async (u: AdminUser, body: Partial<Pick<AdminUser, "status" | "role">>) => {
    setBusy(u.id); setError("");
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setUsers((x) => x.map((y) => (y.id === u.id ? { ...y, ...body } : y)));
    else setError(j.error ?? "Hiba történt.");
    setBusy(null);
  };
  const remove = async (u: AdminUser) => {
    if (!window.confirm(`Véglegesen törlöd ${u.name} fiókját és a mentett fuvarait?`)) return;
    setBusy(u.id); setError("");
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setUsers((x) => x.filter((y) => y.id !== u.id)); else setError(j.error ?? "Hiba történt.");
    setBusy(null);
  };

  const [mail, setMail] = useState<{ ok: boolean; text: string } | null>(null);
  const [mailBusy, setMailBusy] = useState(false);
  const testMail = async () => {
    setMailBusy(true); setMail(null);
    try {
      const res = await fetch("/api/admin/mail-test", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      setMail(j.ok ? { ok: true, text: `Elküldve ide: ${j.to} (feladó: ${j.sender}). Nézd meg a bejövő és a spam mappát is.` } : { ok: false, text: `Hiba: ${j.error ?? "ismeretlen"}` });
    } catch {
      setMail({ ok: false, text: "Hálózati hiba." });
    }
    setMailBusy(false);
  };

  const sorted = [...users].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || +new Date(b.createdAt) - +new Date(a.createdAt));
  const pending = users.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 border-2 border-black bg-white px-4 py-3 text-sm">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-black/55">E-mail küldés (jelszó-visszaállítás, értesítők)</span>
        <button className="btn !py-1.5 !text-xs" onClick={testMail} disabled={mailBusy}>{mailBusy ? "Küldés…" : "✉️ Teszt e-mail küldése"}</button>
        {mail && <span className={`text-xs ${mail.ok ? "text-emerald-700" : "text-rose-700"}`}>{mail.text}</span>}
      </div>
      {pending > 0 && <div className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">⏳ <b>{pending}</b> regisztráció vár jóváhagyásra.</div>}
      {error && <div className="border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      <div className="overflow-hidden border-2 border-black bg-white">
        <ul className="divide-y divide-black/10">
          {sorted.map((u) => (
            <li key={u.id} className={`flex flex-wrap items-center gap-3 px-4 py-4 transition-colors hover:bg-[#f4f4f1] ${busy === u.id ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-black">{u.name}</span>
                  {u.role === "admin" && <span className="bg-black px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#00ff9d]">ADMIN</span>}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${BADGE[u.status]}`}>{LABEL[u.status]}</span>
                </div>
                <div className="truncate text-xs text-slate-500">{u.email}{u.company ? ` · ${u.company}` : ""}</div>
                <div className="text-[11px] text-slate-400">regisztrált {new Date(u.createdAt).toLocaleDateString("hu-HU")}{u.lastLoginAt ? ` · utoljára ${new Date(u.lastLoginAt).toLocaleDateString("hu-HU")}` : ""} · {u.trips} fuvar</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {u.status !== "active" && <button className="btn-primary !px-3 !py-1.5 !text-xs" onClick={() => patch(u, { status: "active" })}>Jóváhagyás</button>}
                {u.status === "active" && u.id !== me && <button className="btn !px-3 !py-1.5 !text-xs" onClick={() => patch(u, { status: "blocked" })}>Tiltás</button>}
                {u.status === "active" && u.id !== me && (
                  <button className="btn !px-3 !py-1.5 !text-xs" onClick={() => patch(u, { role: u.role === "admin" ? "user" : "admin" })}>{u.role === "admin" ? "Admin elvétele" : "Admin jog"}</button>
                )}
                {u.id !== me && <button className="px-1 text-slate-400 hover:text-rose-600" title="Törlés" onClick={() => remove(u)}>✕</button>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
