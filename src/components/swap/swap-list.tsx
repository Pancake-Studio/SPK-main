"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ArrowRight, Ban } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ArrowLeftRight } from "lucide-react";
import { decideSwapAction, cancelSwapAction } from "@/server/actions/swap.actions";
import { initialActionState } from "@/server/actions/_helpers";
import { SWAP_STATUS } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import type { ClientSwap } from "@/lib/types";

type Mode = "incoming" | "outgoing" | "admin";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case SWAP_STATUS.APPROVED:
      return <Badge variant="success">อนุมัติแล้ว</Badge>;
    case SWAP_STATUS.REJECTED:
      return <Badge variant="destructive">ปฏิเสธ</Badge>;
    case SWAP_STATUS.CANCELLED:
      return <Badge variant="muted">ยกเลิก</Badge>;
    default:
      return <Badge variant="warning">รออนุมัติ</Badge>;
  }
}

function DecideActions({ id }: { id: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(decideSwapAction, initialActionState);
  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ดำเนินการแล้ว");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="swapRequestId" value={id} />
      <Button type="submit" name="action" value="REJECT" variant="outline" size="sm" disabled={pending}>
        <X />
        ปฏิเสธ
      </Button>
      <Button type="submit" name="action" value="APPROVE" size="sm" loading={pending}>
        <Check />
        อนุมัติ
      </Button>
    </form>
  );
}

function CancelAction({ id }: { id: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(cancelSwapAction, initialActionState);
  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ยกเลิกแล้ว");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="swapRequestId" value={id} />
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        <Ban />
        ยกเลิกคำขอ
      </Button>
    </form>
  );
}

export function SwapList({ swaps, mode }: { swaps: ClientSwap[]; mode: Mode }) {
  if (swaps.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="ยังไม่มีคำขอแลกคาบ"
        description={
          mode === "incoming"
            ? "เมื่อมีครูส่งคำขอแลกคาบมาหาคุณ จะปรากฏที่นี่"
            : mode === "outgoing"
              ? "คำขอแลกคาบที่คุณส่งจะปรากฏที่นี่"
              : "ยังไม่มีคำขอแลกคาบในระบบ"
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {swaps.map((s) => {
        const pending = s.status === SWAP_STATUS.PENDING;
        return (
          <Card key={s.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.status} />
                  <span className="text-xs text-muted-foreground">{timeAgo(s.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {mode === "incoming" ? (
                    <>
                      <span className="font-medium text-foreground">{s.requesterName}</span> ขอแลกคาบกับคุณ
                    </>
                  ) : mode === "outgoing" ? (
                    <>
                      คุณขอแลกคาบกับ <span className="font-medium text-foreground">{s.targetTeacherName}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">{s.requesterName}</span> →{" "}
                      <span className="font-medium text-foreground">{s.targetTeacherName}</span>
                    </>
                  )}
                </p>
                <div className="flex flex-col gap-1.5 rounded-md bg-muted/50 p-3 text-sm sm:flex-row sm:items-center sm:gap-3">
                  <span className="font-medium text-foreground">{s.sourceLabel}</span>
                  <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                  <span className="font-medium text-foreground">{s.targetLabel}</span>
                </div>
                {s.reason && (
                  <p className="text-sm text-muted-foreground">เหตุผล: {s.reason}</p>
                )}
              </div>

              {pending && (
                <div className="shrink-0">
                  {mode === "outgoing" ? (
                    <CancelAction id={s.id} />
                  ) : (
                    <DecideActions id={s.id} />
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
