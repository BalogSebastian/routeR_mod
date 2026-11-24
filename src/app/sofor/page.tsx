import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import DriverLoader from "@/components/DriverLoader";

// a sofőr-oldal saját, jól olvasható, modern betűtípust kap (napfényben, mobilon is)
const driverFont = Plus_Jakarta_Sans({ variable: "--font-driver", subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata: Metadata = {
  title: "Útvonal a sofőrnek – routeR by tesotter",
  description: "Kamionos útvonal: navigáció indítása Google Maps / Waze / OsmAnd appban, megállók és pihenők.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#050505" };

export default function DriverPage() {
  return (
    <div className={`${driverFont.variable} driver-root`}>
      <DriverLoader />
    </div>
  );
}
