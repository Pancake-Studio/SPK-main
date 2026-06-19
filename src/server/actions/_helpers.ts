// NOTE: shared by both server actions and client components (for
// `initialActionState` / `ActionState`), so this module must stay isomorphic —
// no `server-only` and no server APIs here.
import type { ZodError } from "zod";

/** Standard shape returned by form server actions (for useActionState). */
export type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialActionState: ActionState = { ok: false };

/** Flatten a ZodError into a `{ field: message }` map (first issue per field). */
export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

export function ok(message?: string): ActionState {
  return { ok: true, message };
}
