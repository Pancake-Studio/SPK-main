"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { roleLabel } from "@/lib/role";
import { signOut } from "next-auth/react";
import { unsubscribePushAction } from "@/server/actions/push.actions";

/**
 * Remove this device's push subscription before signing out, so the user stops
 * receiving OS notifications once logged out. Only this browser's subscription
 * is removed — other devices where the user is still signed in keep theirs.
 * Best-effort: never block logout if push cleanup fails.
 */
async function logout() {
  try {
    if ("serviceWorker" in navigator) {
      // `serviceWorker.ready` never rejects; cap it so a missing/idle SW can't
      // stall sign-out indefinitely.
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        // Remove from the server first (still authenticated here), then locally.
        await unsubscribePushAction(sub.endpoint).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
    }
  } catch {
    // ignore — push cleanup must not prevent sign-out
  }
  await signOut({ callbackUrl: "/login" });
}

export function UserMenu({
  name,
  email,
  role,
  avatarUrl,
}: {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">{name}</span>
            <span className="text-xs font-normal text-muted-foreground">{email}</span>
            <span className="mt-1 inline-flex w-fit rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {roleLabel(role)}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings">
            <UserIcon />
            โปรไฟล์และการตั้งค่า
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => logout()}
        >
          <LogOut />
          ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
