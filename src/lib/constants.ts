/** Branding */
export const APP_NAME = "School Productivity Kits";
export const SCHOOL_NAME = "โรงเรียนสันติสุขพิทยาคม";
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
  ASSIGNMENT: "ASSIGNMENT",
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

// Daily period times now live in the DB-backed bell schedule
// (`src/lib/bell-schedule.ts` + the BellSchedule/BellSlot models). Highest
// class-period number we allow on a schedule slot (validation bound).
export const MAX_PERIOD_NUMBER = 20;

/** Notifications infinite-scroll page size (shared by server + client). */
export const NOTIFICATIONS_PAGE_SIZE = 10;

/** Auth/session config. */
// New name for the Auth.js (NextAuth v5) JWT cookie. Deliberately *not*
// "spk_session" — the old custom-session system used that name, and a leftover
// opaque token there makes Auth.js throw "Invalid Compact JWE". Using a fresh
// name means stale old cookies are simply ignored.
export const SESSION_COOKIE = "spk_auth";

/** Data-sync entities (shared between server and client). */
export const ENTITY_KEYS = [
  "teachers",
  "students",
  "classes",
  "subjects",
  "schedules",
] as const;
export type EntityKey = (typeof ENTITY_KEYS)[number];
