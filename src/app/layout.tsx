import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });
const brand = Space_Grotesk({ variable: "--font-brand", subsets: ["latin", "latin-ext"] });
const script = Caveat({ variable: "--font-script", subsets: ["latin", "latin-ext"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "routeR by tesotter", template: "%s – routeR by tesotter" },
  description: "Kamionokra optimalizált útvonaltervezés magasság-, súly- és ADR-korlátokkal, útdíj- és fuvarköltség-számítással.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hu" className={`${inter.variable} ${brand.variable} ${script.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
