import "@/styles/globals.css";

import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { KioskRoot } from "@/components/kiosk/KioskRoot";
import { fontDisplay, fontMono, fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: "EcoCharge Kiosk",
  description: "Recycle bottles. Earn charging credits.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#F6FBF7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "font-sans antialiased",
          fontDisplay.variable,
          fontSans.variable,
          fontMono.variable,
        )}
      >
        <Providers
          themeProps={{
            attribute: "class",
            defaultTheme: "light",
            forcedTheme: "light",
          }}
        >
          <KioskRoot>{children}</KioskRoot>
        </Providers>
      </body>
    </html>
  );
}
