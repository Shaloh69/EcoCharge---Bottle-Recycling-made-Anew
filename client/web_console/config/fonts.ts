import {
  IBM_Plex_Mono as FontPlexMono,
  Manrope as FontManrope,
  Space_Grotesk as FontSpaceGrotesk,
} from "next/font/google";

/**
 * "Operations Console" typography — docs/planning/02-design-mandate.md SS3.
 * Space Grotesk (headings/nav), Manrope (body), IBM Plex Mono (every
 * telemetry number - voltage, current, watts, bin %, credits, countdowns).
 * Replaces Inter/Fira Code, which were the literal banned-pattern default
 * this project's own design mandate names as the single most common tell.
 */

export const fontHeading = FontSpaceGrotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
});

export const fontSans = FontManrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
});

export const fontMono = FontPlexMono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-plex-mono",
});
