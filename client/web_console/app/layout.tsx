import "@/styles/globals.css";
import { Metadata } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { fontHeading, fontMono, fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: "EcoCharge Admin Console",
  description: "EcoCharge system monitoring and management",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className="dark" lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen font-sans antialiased",
          fontSans.variable,
          fontHeading.variable,
          fontMono.variable,
        )}
        style={{ background: "#0A0F0D" }}
      >
        {/* Animated nature mesh gradient — always behind all content */}
        <div className="bg-animated" />
        <div className="bg-noise" />

        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
