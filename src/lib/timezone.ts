/** Wall-clock Bangkok time helpers. Vercel servers run UTC; using plain `new
 *  Date()` makes "today" and "current period" drift by 7 hours for Thai users.
 *  `bangkokDate(d)` returns a Date whose local getters (getHours, getDay, etc.)
 *  reflect Asia/Bangkok wall-clock time, so the rest of the app can keep using
 *  the same getters it already uses. */

export const BANGKOK_TZ = "Asia/Bangkok";

/** Convert a Date to one whose local getters read as Asia/Bangkok time. */
export function bangkokDate(d: Date = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const day = Number(get("day"));
  const h = Number(get("hour"));
  const min = Number(get("minute"));
  const s = Number(get("second"));
  return new Date(y, m - 1, day, h, min, s);
}

/** Bangkok wall-clock date as "YYYY-MM-DD". */
export function bangkokIsoDate(d: Date = new Date()): string {
  const b = bangkokDate(d);
  const y = b.getFullYear();
  const m = String(b.getMonth() + 1).padStart(2, "0");
  const day = String(b.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Bangkok day-of-week: 0 Sun … 6 Sat. */
export function bangkokDayOfWeek(d: Date = new Date()): number {
  return bangkokDate(d).getDay();
}

/** Minutes since midnight in Bangkok. */
export function bangkokMinutesSinceMidnight(d: Date = new Date()): number {
  const b = bangkokDate(d);
  return b.getHours() * 60 + b.getMinutes();
}
