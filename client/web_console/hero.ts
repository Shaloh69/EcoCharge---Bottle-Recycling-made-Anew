import { heroui } from "@heroui/theme";

// ============================================================================
// EcoCharge Admin Console HeroUI Theme — Nature / Forest colour palette
// Matches kiosk_web exactly for brand consistency.
// The console supports both light and dark modes (user-toggleable).
// ============================================================================

export default heroui({
  themes: {
    // ── Dark ─────────────────────────────────────────────────────────────────
    dark: {
      colors: {
        background: "#051A08",
        foreground: "#F0FDF4",

        primary: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
          DEFAULT: "#4CAF50",
          foreground: "#052E16",
        },

        secondary: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
          DEFAULT: "#14B8A6",
          foreground: "#042F2E",
        },

        success: {
          50: "#F7FEE7",
          100: "#ECFCCB",
          200: "#D9F99D",
          300: "#BEF264",
          400: "#A3E635",
          500: "#84CC16",
          600: "#65A30D",
          DEFAULT: "#A3E635",
          foreground: "#1A2E05",
        },

        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          DEFAULT: "#F59E0B",
          foreground: "#1C1917",
        },

        danger: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          DEFAULT: "#F87171",
          foreground: "#450A0A",
        },

        focus: "#4CAF50",

        default: {
          DEFAULT: "transparent",
          foreground: "#F0FDF4",
        },
        content1: "rgba(255,255,255,0.07)",
        content2: "rgba(255,255,255,0.11)",
        content3: "rgba(255,255,255,0.05)",
        content4: "rgba(255,255,255,0.03)",
      },
    },

    // ── Light ────────────────────────────────────────────────────────────────
    light: {
      colors: {
        background: "#F0FDF4",
        foreground: "#14532D",

        primary: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
          DEFAULT: "#16A34A",
          foreground: "#FFFFFF",
        },

        secondary: {
          DEFAULT: "#0D9488",
          foreground: "#FFFFFF",
        },

        success: {
          DEFAULT: "#65A30D",
          foreground: "#FFFFFF",
        },

        warning: {
          DEFAULT: "#D97706",
          foreground: "#FFFFFF",
        },

        danger: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },

        focus: "#16A34A",

        default: {
          DEFAULT: "rgba(255,255,255,0.80)",
          foreground: "#14532D",
        },
        content1: "rgba(255,255,255,0.80)",
        content2: "rgba(255,255,255,0.92)",
        content3: "rgba(240,253,244,0.70)",
        content4: "rgba(220,252,231,0.60)",
      },
    },
  },

  layout: {
    radius: {
      small: "10px",
      medium: "14px",
      large: "20px",
    },
    borderWidth: {
      small: "1px",
      medium: "1.5px",
      large: "2px",
    },
    fontSize: {
      tiny: "0.75rem",
      small: "0.875rem",
      medium: "1rem",
      large: "1.125rem",
    },
    lineHeight: {
      tiny: "1rem",
      small: "1.25rem",
      medium: "1.5rem",
      large: "1.75rem",
    },
  },
});
