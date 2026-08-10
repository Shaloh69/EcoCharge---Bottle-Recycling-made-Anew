"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

import { mantineTheme } from "@/lib/mantineTheme";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

/**
 * Mantine's own color-scheme state was never wired to next-themes — Mantine
 * components (Paper, TextInput, Title, ...) always rendered dark-scheme
 * regardless of the light/dark class next-themes put on <html>. Found via a
 * real screenshot 2026-08-11: switching to light mode changed the page
 * background but left every Mantine component dark, producing unreadable
 * dark-text-on-dark-card contrast. `forceColorScheme` makes Mantine follow
 * next-themes' resolved value instead of managing its own, separate state.
 */
function MantineBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <MantineProvider
      defaultColorScheme="dark"
      forceColorScheme={mounted && resolvedTheme === "light" ? "light" : "dark"}
      theme={mantineTheme}
    >
      <Notifications limit={5} position="top-right" />
      {children}
    </MantineProvider>
  );
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <NextThemesProvider {...themeProps}>
      <MantineBridge>{children}</MantineBridge>
    </NextThemesProvider>
  );
}
