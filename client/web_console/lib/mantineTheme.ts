import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * EcoCharge Admin Console — Mantine theme, "Operations Console" direction.
 *
 * Ported 1:1 from the retired hero.ts (same hex values, same intent) so the
 * console doesn't visually reset mid-migration — this file is the real
 * theme going forward, hero.ts is deleted. Full spec: docs/planning/02-design-mandate.md SS3.
 */

const ecoGreen: MantineColorsTuple = [
  "#F0FDF4",
  "#DCFCE7",
  "#BBF7D0",
  "#86EFAC",
  "#4ADE80",
  "#22C55E",
  "#16A34A",
  "#15803D",
  "#166534",
  "#14532D",
];

const voltTeal: MantineColorsTuple = [
  "#F0FDFA",
  "#CCFBF1",
  "#99F6E4",
  "#5EEAD4",
  "#2DD4BF",
  "#14B8A6",
  "#0D9488",
  "#0F766E",
  "#115E59",
  "#134E4A",
];

const successLime: MantineColorsTuple = [
  "#F7FEE7",
  "#ECFCCB",
  "#D9F99D",
  "#BEF264",
  "#A3E635",
  "#84CC16",
  "#65A30D",
  "#4D7C0F",
  "#3F6212",
  "#365314",
];

const warningAmber: MantineColorsTuple = [
  "#FFFBEB",
  "#FEF3C7",
  "#FDE68A",
  "#FCD34D",
  "#FBBF24",
  "#F59E0B",
  "#D97706",
  "#B45309",
  "#92400E",
  "#78350F",
];

const dangerRed: MantineColorsTuple = [
  "#FFF1F2",
  "#FFE4E6",
  "#FECDD3",
  "#FCA5A5",
  "#F87171",
  "#EF4444",
  "#DC2626",
  "#B91C1C",
  "#991B1B",
  "#7F1D1D",
];

// Purple — confirmed 2026-08-10 as a real, deliberate tertiary accent by the
// Kiosk's actual Figma reference (docs/planning/02-design-mandate.md SS4.6),
// not the banned-pattern violation an earlier pass in this project wrongly
// flagged it as. Kept for consistency across surfaces even though the Admin
// Console's own reference doesn't use it as heavily as the Kiosk does.
const bloomViolet: MantineColorsTuple = [
  "#F5F3FF",
  "#EDE9FE",
  "#DDD6FE",
  "#C4B5FD",
  "#A78BFA",
  "#9B6FE0",
  "#8B5CF6",
  "#7C3AED",
  "#6D28D9",
  "#5B21B6",
];

export const mantineTheme = createTheme({
  primaryColor: "ecoGreen",
  primaryShade: { light: 6, dark: 4 },
  colors: {
    ecoGreen,
    voltTeal,
    successLime,
    warningAmber,
    dangerRed,
    bloomViolet,
  },
  fontFamily:
    "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif",
  headings: {
    fontFamily:
      "var(--font-space-grotesk), 'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    fontWeight: "700",
  },
  fontFamilyMonospace:
    "var(--font-plex-mono), 'IBM Plex Mono', ui-monospace, monospace",
  defaultRadius: "md",
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
  black: "#051A08",
  white: "#F0FDF4",
  other: {
    // Raw surface tokens for anything that needs the exact "Operations
    // Console" background ramp outside Mantine's own color-scheme system —
    // components.spec.md SS3's dark background ramp.
    bgApp: "#0A0F0D",
    bgPanel: "#111816",
    bgRaised: "#1A2420",
  },
});
