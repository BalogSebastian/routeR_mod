import { getUser } from "@/lib/server/auth";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Regisztráció – routeR by tesotter" };

/**
 * Nem az (auth) csoportban van: ott a belépett felhasználót azonnal továbbdobnánk a saját fiókjába,
 * így a tesotter.com/routerget-ről érkező új érdeklődő egy régi munkamenet fiókjában landolna.
 * Itt inkább megmutatjuk, ki van belépve, és felajánljuk a kilépést.
 */
export default async function RegisterPage() {
  const u = await getUser();
  return <RegisterForm current={u ? { name: u.name, email: u.email } : null} />;
}
