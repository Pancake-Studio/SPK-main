import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely (conditional + de-duplicated). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Relative "time ago" label for notifications, e.g. "3 นาทีที่แล้ว". */
export function timeAgo(date: Date | string, locale = "th-TH") {
  const d = new Date(date);
  const diff = (d.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const ranges: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, secs] of ranges) {
    if (Math.abs(diff) >= secs || unit === "second") {
      return rtf.format(Math.round(diff / secs), unit);
    }
  }
  return "";
}

/** Initials for avatars, e.g. "Somchai Jaidee" -> "SJ". */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** True if every whitespace-separated term in `query` appears (case-insensitive)
 *  somewhere in `parts`. Empty query matches everything. For client-side table
 *  search over a few known fields. */
export function matchesQuery(
  parts: (string | number | null | undefined)[],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = parts.filter((p) => p != null).join(" ").toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

