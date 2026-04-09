import "@/styles/globals.css";

import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";
import { KioskRoot } from "@/components/kiosk/KioskRoot";

export const metadata: Metadata = {
  title: "EcoCharge Kiosk",
  description: "Recycle bottles. Earn charging credits.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#07120A",
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
      <body className={clsx("font-sans antialiased")}>
        <Providers
          themeProps={{
            attribute: "class",
            defaultTheme: "dark",
            forcedTheme: "dark",
          }}
        >
          <KioskRoot>{children}</KioskRoot>
        </Providers>
      </body>
    </html>
  );
}
