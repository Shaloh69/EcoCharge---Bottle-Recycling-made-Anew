import { Baloo_2 as FontBaloo, IBM_Plex_Sans as FontPlexSans } from "next/font/google";

/**
 * Same "Clean Energy Reward" typography as client/kiosk_web (Baloo 2 display
 * + IBM Plex Sans body) — deliberate cross-surface consistency, per
 * docs/planning/02-design-mandate.md SS6: this site shares the identity
 * with the Kiosk and Mobile App, not the Admin Console's separate
 * "Operations Console" stack.
 */

export const fontDisplay = FontBaloo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo",
});

export const fontSans = FontPlexSans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});
