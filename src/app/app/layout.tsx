import { redirect } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import AppShell from "@/components/app/AppShell";
import { getUser } from "@/lib/server/auth";

const appFont = Plus_Jakarta_Sans({ variable: "--font-driver", subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata = { title: "Irányítópult" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.status !== "active") redirect("/wait");
  return (
    <div className={`${appFont.variable} driver-root`}>
      <AppShell user={{ name: u.name, email: u.email, admin: u.role === "admin" }}>{children}</AppShell>
    </div>
  );
}
