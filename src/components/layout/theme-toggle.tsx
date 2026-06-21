"use client";

import * as React from "react";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Light/dark toggle. Renders a stable placeholder until mounted (SSR-safe). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={!mounted ? "สลับธีม" : isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-5" />
        ) : (
          <Moon className="size-5" />
        )
      ) : (
        <Sun className="size-5 opacity-0" />
      )}
    </Button>
  );
}
