"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { changePasswordAction } from "@/server/actions/auth.actions";
import { initialActionState } from "@/server/actions/_helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialActionState,
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "เปลี่ยนรหัสผ่านแล้ว");
      formRef.current?.reset();
    } else if (state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        {state.fieldErrors?.currentPassword && (
          <p className="text-xs text-destructive">{state.fieldErrors.currentPassword}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
          {state.fieldErrors?.newPassword && (
            <p className="text-xs text-destructive">{state.fieldErrors.newPassword}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          {state.fieldErrors?.confirmPassword && (
            <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword}</p>
          )}
        </div>
      </div>
      <Button type="submit" loading={pending}>
        บันทึกรหัสผ่านใหม่
      </Button>
    </form>
  );
}
