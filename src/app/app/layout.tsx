import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { getUser } from "@/lib/server/auth";

export const metadata = { title: "Irányítópult" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (u.status !== "active") redirect("/wait");
  return <AppShell user={{ name: u.name, email: u.email, admin: u.role === "admin" }}>{children}</AppShell>;
}
