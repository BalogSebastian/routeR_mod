import LoadingTool from "@/components/app/LoadingTool";
import { PageHead } from "@/components/app/RouteNet";

export const metadata = { title: "Rakodás" };

export default function LoadingPage() {
  return (
    <div className="space-y-8">
      <PageHead kicker="Raklapok, rakméter, tömeg" title="Rakodás" sub="Hány raklap fér fel, mennyi rakmétert foglal, és belefér-e a tömegbe? Add meg a raklapokat, és felülnézetben megmutatjuk az elrendezést." />
      <LoadingTool />
    </div>
  );
}
