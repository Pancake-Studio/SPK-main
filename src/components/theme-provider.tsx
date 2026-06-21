"use client";

import * as React from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Minimal light/dark theme provider (replaces next-themes).
 *
 * The pre-hydration class is set by an inline script in the server root layout
 * (`themeInitScript` in @/lib/theme), so there's no flash. This client provider
 * only owns runtime state + the toggle. Keeping the init script in a *server*
 * component avoids React 19's "script tag rendered on the client" warning that
 * next-themes triggers.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  const el = document.documentElement;
  el.classList.toggle("dark", resolved === "dark");
  el.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>("light");

  // Hydrate the stored preference (matches the pre-paint init script).
  React.useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
  }, []);

  // Resolve + apply, and follow the OS when in "system" mode.
  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = () => {
      const resolved: ResolvedTheme =
        theme === "system" ? (mql.matches ? "dark" : "light") : theme;
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    compute();
    if (theme !== "system") return;
    mql.addEventListener("change", compute);
    return () => mql.removeEventListener("change", compute);
  }, [theme]);

  // Keep tabs in sync.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next = e.newValue as Theme | null;
      setThemeState(next === "light" || next === "dark" ? next : "system");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode / storage disabled — still update in-memory */
    }
    setThemeState(next);
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (ctx) return ctx;
  // Safe fallback if used outside the provider.
  return {
    theme: "system",
    resolvedTheme: typeof window === "undefined" ? "light" : systemTheme(),
    setTheme: () => {},
  };
}
