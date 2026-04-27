import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "LINKUP — GPS и CRM для курьеров",
  description: "Управляй курьерами и клиентами в одной системе",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full">
      <body className={`${manrope.className} h-full bg-slate-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
