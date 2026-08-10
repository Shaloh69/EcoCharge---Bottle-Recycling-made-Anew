"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <NextThemesProvider
      {...themeProps}
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
    >
      <Toaster
        position="bottom-center"
        offset={24}
        visibleToasts={3}
        toastOptions={{
          classNames: {
            toast: "font-sans rounded-lg",
          },
        }}
      />
      {children}
    </NextThemesProvider>
  );
}
