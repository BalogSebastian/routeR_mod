"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** „Kérdésed van? Írj nekünk”: bárhonnan megnyitható (openFeedback), a levél a csapathoz fut be */
export const FEEDBACK_EVENT = "routeR:feedback";
export const openFeedback = () => window.dispatchEvent(new Event(FEEDBACK_EVENT));

const TOPICS = ["Kérdés", "Hibajelzés", "Ötlet", "Egyéb"] as const;

export default function FeedbackDialog({ email }: { email: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("Kérdés");
  const [msg, setMsg] = useState("");
  const [state, setState] = useState<"" | "sending" | "sent" | "error">("");
  const [err, setErr] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const show = () => { setOpen(true); setState(""); setErr(""); };
    window.addEventListener(FEEDBACK_EVENT, show);
    return () => window.removeEventListener(FEEDBACK_EVENT, show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => ta.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const send = async () => {
    setState("sending"); setErr("");
    const r = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, message: msg, page: path }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (r?.ok) { setState("sent"); setMsg(""); }
    else { setState("error"); setErr(j?.error ?? "Nem sikerült elküldeni. Ellenőrizd a kapcsolatot."); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 backdrop-blur-[2px] sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)} role="dialog" aria-modal aria-label="Üzenet a routeR csapatnak">
      <div className="rr-up w-full max-w-lg border-2 border-black bg-white shadow-[10px_10px_0_0_#00ff9d]" style={{ animationDuration: "0.35s" }}>
        <div className="relative overflow-hidden bg-[#050505] px-6 py-5 text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(90deg,#00ff9d_0_1px,transparent_1px_28px)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#00ff9d]">Írj nekünk</div>
              <div className="mt-2 text-[24px] font-black uppercase leading-none tracking-tight" style={{ fontFamily: "var(--font-brand)" }}>Kérdésed van?</div>
              <p className="mt-2 text-[13px] leading-relaxed text-white/60">Személyesen olvassuk, és a(z) <b className="text-white">{email}</b> címre válaszolunk.</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Bezárás" className="text-[22px] leading-none text-white/50 transition hover:text-white">×</button>
          </div>
        </div>
        {state === "sent" ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center bg-[#00ff9d] text-2xl shadow-[4px_4px_0_0_#000]">✓</div>
            <p className="mt-5 text-[19px] font-black uppercase tracking-tight text-black" style={{ fontFamily: "var(--font-brand)" }}>Megkaptuk, köszönjük!</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-black/55">Hamarosan válaszolunk e-mailben.</p>
            <button onClick={() => setOpen(false)} className="btn-primary mt-7">Bezárás</button>
          </div>
        ) : (
          <form className="space-y-4 px-6 py-6" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button type="button" key={t} onClick={() => setTopic(t)} className={`border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition ${topic === t ? "border-black bg-black text-[#00ff9d]" : "border-black/15 text-black/60 hover:border-black"}`}>{t}</button>
              ))}
            </div>
            <textarea ref={ta} value={msg} onChange={(e) => setMsg(e.target.value)} rows={6} maxLength={4000}
              placeholder={topic === "Hibajelzés" ? "Mi történt, és mit vártál volna? Melyik fuvarnál / oldalon?" : topic === "Ötlet" ? "Mi tenné jobbá a routeR-t a napi munkádban?" : "Írd ide az üzeneted…"}
              className="w-full resize-y border-2 border-black/15 bg-[#fafaf7] p-3 text-[15px] leading-relaxed text-black outline-none transition focus:border-black" />
            <div className="flex items-center justify-between gap-3">
              <span className={`text-[12.5px] ${err ? "text-rose-600" : "text-black/40"}`}>{err || `${msg.length}/4000`}</span>
              <button disabled={state === "sending" || msg.trim().length < 3} className="btn-primary">{state === "sending" ? "Küldés…" : "Küldés →"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
