import BanCalendar from "@/components/app/BanCalendar";
import { PageHead } from "@/components/app/RouteNet";

export const metadata = { title: "Kamionstop-naptár" };

export default function BansPage() {
  return (
    <div className="space-y-8">
      <PageHead kicker="Hétvégi és ünnepnapi tilalmak" title="Kamionstop" sub="A következő napok tehergépjármű-forgalmi tilalmai országonként, közép-európai időben. A tervező ugyanezekkel a szabályokkal számol: a fuvarba automatikusan beépíti a várakozást." />
      <BanCalendar />
    </div>
  );
}
