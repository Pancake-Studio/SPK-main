"use client";

import * as React from "react";
import { timeAgo } from "@/lib/utils";

/**
 * Hydration-safe relative time.
 *
 * Second-level relative strings ("14 วินาทีที่ผ่านมา") are computed from the
 * current clock, so the SSR render and the client hydration — which happen a
 * moment apart — produce different text and throw a hydration error (in dev
 * that error overlay blocks the whole page). We render the server value as-is
 * with `suppressHydrationWarning`, then re-render right after mount to show the
 * live value and refresh it periodically.
 */
export function TimeAgo({
  date,
  className,
  refreshMs = 30_000,
}: {
  date: string | Date;
  className?: string;
  refreshMs?: number;
}) {
  const [, force] = React.useReducer((n) => n + 1, 0);

  React.useEffect(() => {
    force(); // re-sync to the client clock immediately after mount
    const id = setInterval(force, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  return (
    <span className={className} suppressHydrationWarning>
      {timeAgo(date)}
    </span>
  );
}
