import Link from "next/link";
import { Logo, Wordmark } from "@/components/Brand";

/** Minimalista, világos lilás-fehér belépő keret */
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="auth-bg flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3"><Logo className="h-10 w-10" /><Wordmark /></Link>
      <div className="w-full max-w-[400px] rounded-3xl border border-slate-200/80 bg-white/80 p-7 shadow-xl shadow-violet-900/[0.06] backdrop-blur sm:p-9">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
      {footer && <div className="mt-6 text-sm text-slate-500">{footer}</div>}
      <p className="mt-10 text-[11px] tracking-wide text-slate-400">© tesotter · <a className="hover:text-violet-600" href="https://www.tesotter.com">www.tesotter.com</a></p>
    </div>
  );
}
