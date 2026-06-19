"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type DeleteResult = { ok: boolean; error?: string };

/**
 * Generic delete button. The specific server action is passed in as a prop
 * (server actions are valid client props).
 */
export function DeleteButton({
  id,
  action,
  confirmText = "ยืนยันการลบรายการนี้?",
}: {
  id: string;
  action: (id: string) => Promise<DeleteResult>;
  confirmText?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(confirmText)) return;
    startTransition(async () => {
      const res = await action(id);
      if (res?.ok) {
        toast.success("ลบเรียบร้อยแล้ว");
        router.refresh();
      } else {
        toast.error(res?.error ?? "ลบไม่สำเร็จ");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="ลบ"
      onClick={onClick}
      loading={pending}
      className="text-muted-foreground hover:text-destructive"
    >
      {!pending && <Trash2 className="size-4" />}
    </Button>
  );
}
