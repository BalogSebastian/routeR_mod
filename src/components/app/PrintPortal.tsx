"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A gyerek a <body> közvetlen #rr-print-root elemébe kerül; nyomtatáskor (gomb vagy Cmd+P)
 * csak az látszik, így a böngésző „Mentés PDF-ként” tiszta A4-es dokumentumot ad.
 */
export default function PrintPortal({ children }: { children: React.ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "rr-print-root";
    document.body.appendChild(el);
    const on = () => document.body.classList.add("rr-printing");
    const off = () => document.body.classList.remove("rr-printing");
    window.addEventListener("beforeprint", on);
    window.addEventListener("afterprint", off);
    // a portál gyökere csak a böngészőben létezik: egyszeri beállítás a felcsatoláskor
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoot(el);
    return () => { window.removeEventListener("beforeprint", on); window.removeEventListener("afterprint", off); off(); el.remove(); };
  }, []);
  return root ? createPortal(children, root) : null;
}

export function printDoc(title?: string) {
  const prev = document.title;
  if (title) document.title = title;
  document.body.classList.add("rr-printing");
  window.print();
  setTimeout(() => { document.title = prev; document.body.classList.remove("rr-printing"); }, 500);
}
