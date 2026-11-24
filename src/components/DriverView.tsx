"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CARGO_LABEL } from "@/lib/crossings";
import { appleUrl, decodeTrip, driverGeometry, flyFromDriver, googleLinks, gpxFor, wazeUrl, type DriverTrip } from "@/lib/navlinks";
import { COUNTRY_NAMES } from "@/lib/country-names";
import { dt, dur, flag } from "@/lib/format";

const FlyPlayer = dynamic(() => import("./FlyPlayer"), { ssr: false, loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-sm font-medium text-white/80">Lejátszó betöltése…</div> });

const KIND: Record<string, { icon: string; label: string; tone: string }> = {
  break: { icon: "☕", label: "45 perc szünet", tone: "bg-amber-50 text-amber-700" },
  rest: { icon: "🌙", label: "Napi pihenő", tone: "bg-indigo-50 text-indigo-700" },
  wait: { icon: "⏳", label: "Várakozás (tilalom)", tone: "bg-rose-50 text-rose-700" },
  ferry: { icon: "⛴", label: "Komp / vasút", tone: "bg-sky-50 text-sky-700" },
};
const CARGO_ICON: Record<string, string> = { load: "⬆", unload: "⬇", both: "⇅", none: "•" };

function Sect({ title, children }: { title: string; children: React.ReactNode }) {
  return (
  <section className="driver-in">
    <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
      <span className="h-3.5 w-1 rounded-full bg-violet-500" />{title}
    </h2>
    {children}
  </section>
  );
}

/** Sofőr-oldal: mobilra, nagy gombokkal; a navigáció egy koppintással indul. */
export default function DriverView() {
  // a komponens csak a böngészőben fut (ssr: false), ezért a hash az első rendereléskor olvasható
  const [hash] = useState(() => window.location.hash.match(/#d=([^&]+)/)?.[1] ?? "");
  // a „videó-link” (&play=1) rögtön elindítja a lejátszást
  const [playing, setPlaying] = useState(() => /[#&]play=1/.test(window.location.hash));
  const key = `tesotter-driver-${hash.slice(-24)}`;
  const [trip, setTrip] = useState<DriverTrip | null>(null);
  const [err, setErr] = useState(hash ? "" : "Hiányzó útvonal – kérd újra a linket a diszpécsertől.");
  const [done, setDone] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (!hash) return;
    decodeTrip(hash).then(setTrip).catch(() => setErr("A link sérült vagy hiányos – kérd újra a diszpécsertől."));
  }, [hash]);

  const links = useMemo(() => (trip ? googleLinks(trip.p) : []), [trip]);
  const fly = useMemo(() => (trip ? flyFromDriver(trip) : null), [trip]);
  const stops = trip?.p.filter((p) => p.stop) ?? [];

  const toggleDone = (i: number) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* privát mód */ }
  };

  const gpx = async () => {
    if (!trip) return;
    const text = gpxFor(trip.t, trip.p, driverGeometry(trip));
    const file = new File([text], "utvonal.gpx", { type: "application/gpx+xml" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: trip.t }); return; } catch { /* megszakítva */ }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "utvonal.gpx";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (err) return <div className="flex h-dvh items-center justify-center bg-slate-50 p-8 text-center text-[15px] font-medium text-slate-600">{err}</div>;
  if (!trip) return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-slate-50 text-sm font-medium text-slate-500">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      Útvonal betöltése…
    </div>
  );

  const next = links.findIndex((_, i) => !done.includes(i));
  const [from, ...restTitle] = trip.t.split("→");
  const to = restTitle.join("→").trim();

  return (
    <div className="min-h-dvh bg-slate-50 pb-12">
      {playing && fly && <FlyPlayer data={fly} onClose={() => setPlaying(false)} />}
      <header className="driver-hero relative overflow-hidden px-5 pb-16 pt-6 text-white">
        <div className="relative z-10 mx-auto max-w-xl">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19c4 0 3-14 7-14s3 14 7 14" /></svg>
            </span>
            routeR by tesotter · sofőr
          </div>
          <h1 className="mt-5 text-[30px] font-extrabold leading-[1.1] tracking-tight">
            {from.trim()}
            {to && <><span className="mx-2 font-medium text-violet-300">→</span><span className="block sm:inline">{to}</span></>}
          </h1>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {[
              { k: "Távolság", v: `${trip.km.toLocaleString("hu-HU")} km` },
              { k: "Vezetési idő", v: dur(trip.driveMin) },
              { k: "Indulás", v: dt(trip.dep) },
              { k: "Érkezés", v: `~${dt(trip.arr)}` },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-md">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200">{x.k}</div>
                <div className="mt-0.5 text-[16px] font-bold tabular-nums">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto -mt-9 max-w-xl space-y-6 px-4">
        {trip.w.length > 0 && (
          <section className="driver-in space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] font-medium leading-snug text-amber-950 shadow-sm">
            {trip.w.map((w, i) => <div key={i} className="flex gap-2"><span>⚠️</span><span>{w}</span></div>)}
          </section>
        )}

        <section className="driver-in space-y-2.5">
          {links.map((l, i) => (
            <div key={l.url} className={`flex items-stretch gap-2 transition ${done.includes(i) ? "opacity-45" : ""}`}>
              <a href={l.url} className={`group flex flex-1 items-center gap-3.5 rounded-3xl px-5 py-4 text-white transition active:scale-[0.985] ${i === next || links.length === 1 ? "driver-cta" : "bg-slate-600 shadow-lg shadow-slate-900/15"}`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-px" fill="currentColor"><path d="M7 4.8v14.4a1 1 0 001.5.86l12-7.2a1 1 0 000-1.72l-12-7.2A1 1 0 007 4.8z" /></svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-extrabold leading-tight">Navigáció indítása{links.length > 1 ? ` · ${l.label}` : ""}</span>
                  <span className="mt-0.5 block truncate text-[12px] font-medium text-white/80">Google Maps · {l.from} → {l.to}</span>
                </span>
              </a>
              {links.length > 1 && (
                <button onClick={() => toggleDone(i)} className="w-[68px] shrink-0 rounded-3xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 shadow-sm transition active:scale-95">
                  {done.includes(i) ? "↺" : "✓ kész"}
                </button>
              )}
            </div>
          ))}
          {links.length > 1 && <p className="px-1 text-[12px] leading-relaxed text-slate-500">A szakaszokat sorban nyisd meg: ha elérted egy szakasz célját, jelöld késznek, és indítsd a következőt.</p>}
          {fly && (
            <button onClick={() => setPlaying(true)} className="group flex w-full items-center gap-3.5 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-3.5 text-left shadow-sm transition active:scale-[0.985]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg text-white shadow-md shadow-violet-600/30">🎬</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-slate-900">Útvonal-lejátszás (videó)</span>
                <span className="mt-0.5 block text-[12px] text-slate-500">Nézd végig előre: melyik úton, mennyivel, hol és mikor megy</span>
              </span>
            </button>
          )}
          <button onClick={gpx} className="flex w-full items-center gap-3.5 rounded-3xl border border-slate-200 bg-white px-5 py-3.5 text-left shadow-sm transition active:scale-[0.985]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-xl">🧭</span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-slate-900">Pontos kamionos nyomvonal (OsmAnd)</span>
              <span className="mt-0.5 block text-[12px] text-slate-500">GPX → OsmAnd: „Navigáció a nyomvonal mentén”</span>
            </span>
          </button>
        </section>

        <Sect title="Megállók">
          <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[29px] before:top-6 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-emerald-300 before:via-violet-200 before:to-rose-300">
            {stops.map((p, i) => {
              const first = i === 0, last = i === stops.length - 1;
              return (
                <li key={i} className="relative rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-violet-900/[0.04]">
                  <div className="flex items-start gap-3.5">
                    <span className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white ring-4 ring-white ${first ? "bg-emerald-500" : last ? "bg-rose-500" : "bg-violet-600"}`}>
                      {first ? "A" : last ? "B" : i}
                    </span>
                    <div className="min-w-0 flex-1 pt-px">
                      <div className="text-[17px] font-bold leading-tight text-slate-900">{p.label}</div>
                      {p.cargo && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600">
                          {CARGO_ICON[p.cargo]} {CARGO_LABEL[p.cargo]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-[13px] font-bold">
                    <a className="flex items-center justify-center rounded-xl bg-[#e8f0fe] py-2.5 text-[#1a56c4] transition active:scale-95" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=driving&dir_action=navigate`}>Google</a>
                    <a className="flex items-center justify-center rounded-xl bg-[#e3f6ff] py-2.5 text-[#0a7ab0] transition active:scale-95" href={wazeUrl(p)}>Waze</a>
                    <a className="flex items-center justify-center rounded-xl bg-slate-100 py-2.5 text-slate-700 transition active:scale-95" href={appleUrl(p)}>Apple</a>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-slate-500">A megállónkénti gombok csak a célt adják át (személyautós útvonal) – a kamionos útvonalhoz a fenti „Navigáció indítása” gombot használd.</p>
        </Sect>

        {trip.s.length > 0 && (
          <Sect title="Szünetek, pihenők (tervezett)">
            <ul className="space-y-2">
              {trip.s.map((s, i) => {
                const k = KIND[s.k] ?? { icon: "•", label: s.k, tone: "bg-slate-100 text-slate-600" };
                return (
                  <li key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-violet-900/[0.03]">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${k.tone}`}>{k.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-bold text-slate-900">{k.label}</span>
                      <span className="block truncate text-[12px] text-slate-500">{s.place ?? `${flag(s.country)} ${COUNTRY_NAMES[s.country] ?? s.country}`} · {s.km} km</span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-[12px] font-bold tabular-nums text-slate-700">{dt(s.time)}</span>
                  </li>
                );
              })}
            </ul>
          </Sect>
        )}

        {trip.f.length > 0 && (
          <Sect title="Komp / vasút">
            <ul className="space-y-2">
              {trip.f.map((f, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-[14px] font-semibold text-slate-800 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-lg">⛴</span>
                  <span>{f.name}<span className="block text-[12px] font-medium text-slate-500">{f.from} → {f.to}</span></span>
                </li>
              ))}
            </ul>
          </Sect>
        )}

        <p className="rounded-2xl bg-slate-100/70 px-4 py-3 text-[11.5px] leading-relaxed text-slate-500">
          A Google Maps / Waze személyautós útvonalat számol, a kamionos korlátozásokat (magasság, súly, tilalmak) nem ismeri: az irányító pontok a megtervezett útvonalon tartanak, de a táblákat mindig kövesd.
        </p>
      </main>
    </div>
  );
}
