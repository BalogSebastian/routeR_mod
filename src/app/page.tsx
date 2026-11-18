import { redirect } from "next/navigation";
import { getUser } from "@/lib/server/auth";

export default async function Home() {
  const u = await getUser();
  redirect(!u ? "/login" : u.status === "active" ? "/app" : "/wait");
}
