import { redirect } from "next/navigation";
import { getUser } from "@/lib/server/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser();
  if (u) redirect(u.status === "active" ? "/app" : "/wait");
  return children;
}
