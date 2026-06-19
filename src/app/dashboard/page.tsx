import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLE_HOME, type Role } from "@/lib/constants";

/** Role-aware entry point: sends each user to their own dashboard. */
export default async function DashboardRouter() {
  const user = await requireUser();
  redirect(ROLE_HOME[user.role as Role] ?? "/login");
}
