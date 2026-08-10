import type { Metadata } from "next";

import "./globals.css";
import { fontDisplay, fontSans } from "@/config/fonts";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "EcoCharge — Recycle bottles, earn charging credits",
    template: "%s — EcoCharge",
  },
  description:
    "EcoCharge turns recycled PET bottles into free phone-charging credits through an AI-graded reverse-vending kiosk.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
