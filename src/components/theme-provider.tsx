"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * App-wide theme provider.
 *
 * - `attribute="class"` toggles the `.dark` class consumed by our Tailwind
 *   `@custom-variant dark` in globals.css.
 * - `enableSystem` honours `prefers-color-scheme`.
 * - `disableTransitionOnChange` avoids a flash of transitions when flipping.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
