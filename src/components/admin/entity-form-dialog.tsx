"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/server/actions/_helpers";
import { initialActionState } from "@/server/actions/_helpers";

type Children = (helpers: { fieldErrors?: Record<string, string> }) => React.ReactNode;

/**
 * Reusable "Add …" dialog wrapping a server action with useActionState.
 * Fields are provided via a render-prop so each entity supplies its own inputs
 * and can surface per-field errors.
 */
export function EntityFormDialog({
  title,
  description,
  triggerLabel,
  action,
  children,
  submitLabel = "บันทึก",
}: {
  title: string;
  description?: string;
  triggerLabel: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: Children;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(action, initialActionState);

  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "บันทึกเรียบร้อยแล้ว");
      setOpen(false);
      router.refresh();
    } else if (state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {children({ fieldErrors: state.fieldErrors })}
          {state.error && !state.fieldErrors && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
