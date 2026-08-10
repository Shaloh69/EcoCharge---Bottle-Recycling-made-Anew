import {
  Baloo_2 as FontBaloo,
  IBM_Plex_Mono as FontPlexMono,
  IBM_Plex_Sans as FontPlexSans,
} from "next/font/google";

/**
 * Kiosk typography — docs/planning/02-design-mandate.md SS4.6, corrected
 * against the real Figma reference (EcoCharge.pdf) rather than the earlier
 * speculative Outfit/IBM-Plex-Sans-only guidance. Baloo 2 is a real, free
 * Google Font in the same rounded/bubble-letter family the reference deck
 * uses for headings, buttons, and the logotype (alongside Fredoka/Quicksand/
 * Comfortaa as legitimate alternates - Baloo 2 chosen and committed to,
 * don't mix in another one later). IBM Plex Sans carries body copy. Credit
 * numerals use tabular figures within Baloo 2 itself, not a separate mono
 * family - see SS4.6's typography correction for why.
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

export const fontMono = FontPlexMono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-plex-mono",
});
