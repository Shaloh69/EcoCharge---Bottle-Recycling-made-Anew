"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { mantineTheme } from "@/lib/mantineTheme";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <NextThemesProvider {...themeProps}>
      <MantineProvider defaultColorScheme="dark" theme={mantineTheme}>
        <Notifications limit={5} position="top-right" />
        {children}
      </MantineProvider>
    </NextThemesProvider>
  );
}
