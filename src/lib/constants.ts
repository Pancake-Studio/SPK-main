/** Branding */
export const APP_NAME = "SPK Platform";
export const SCHOOL_NAME = "SPK School";
export const SCHOOL_SHORT = "SPK";

/**
 * Roles. Kept as a const object (not a Prisma enum) so the same schema runs on
 * SQLite locally and PostgreSQL in production. Values are stored as strings.
 */
export const ROLES = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ALL_ROLES: Role[] = [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT];

/** Where each role lands after login. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

/** Swap request lifecycle.
 *  PENDING → APPROVED → (CANCEL_REQUESTED → REVERTED) | REJECTED | CANCELLED */
export const SWAP_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  CANCEL_REQUESTED: "CANCEL_REQUESTED", // approved swap, cancellation awaiting the other teacher
  REVERTED: "REVERTED", // cancellation approved → schedules restored to original
} as const;
export type SwapStatus = (typeof SWAP_STATUS)[keyof typeof SWAP_STATUS];

/** Notification categories (drives icon + accent in the UI). */
export const NOTIFICATION_TYPES = {
  SWAP_REQUEST: "SWAP_REQUEST",
  SWAP_APPROVED: "SWAP_APPROVED",
  SWAP_REJECTED: "SWAP_REJECTED",
  SWAP_CANCEL_REQUEST: "SWAP_CANCEL_REQUEST",
  SWAP_CANCELLED: "SWAP_CANCELLED",
  SCHEDULE_CHANGED: "SCHEDULE_CHANGED",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  EMERGENCY: "EMERGENCY",
} as const;
export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** Teaching week. `key` matches the `Schedule.day` column. */
export const DAYS = [
  { key: "MON", label: "Monday", labelTh: "จันทร์", short: "Mon" },
  { key: "TUE", label: "Tuesday", labelTh: "อังคาร", short: "Tue" },
  { key: "WED", label: "Wednesday", labelTh: "พุธ", short: "Wed" },
  { key: "THU", label: "Thursday", labelTh: "พฤหัสบดี", short: "Thu" },
  { key: "FRI", label: "Friday", labelTh: "ศุกร์", short: "Fri" },
] as const;
export type DayKey = (typeof DAYS)[number]["key"];
export const DAY_KEYS = DAYS.map((d) => d.key) as DayKey[];

/** Daily periods with their clock times (used by the timetable + "current period"). */
export const PERIODS = [
  { period: 1, start: "08:30", end: "09:20" },
  { period: 2, start: "09:20", end: "10:10" },
  { period: 3, start: "10:25", end: "11:15" },
  { period: 4, start: "11:15", end: "12:05" },
  { period: 5, start: "13:00", end: "13:50" },
  { period: 6, start: "13:50", end: "14:40" },
  { period: 7, start: "14:55", end: "15:45" },
  { period: 8, start: "15:45", end: "16:35" },
] as const;
export type PeriodNo = (typeof PERIODS)[number]["period"];
export const PERIOD_NUMBERS: number[] = PERIODS.map((p) => p.period);

/** Auth/session config. */
export const SESSION_COOKIE = "spk_session";
export const SESSION_MAX_AGE_DAYS = 7;
export const CSRF_COOKIE = "spk_csrf";
