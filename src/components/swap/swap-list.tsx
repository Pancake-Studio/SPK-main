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
import {
  decideSwapAction,
  cancelSwapAction,
  requestSwapCancelAction,
  decideSwapCancelAction,
} from "@/server/actions/swap.actions";
import { initialActionState } from "@/server/actions/_helpers";
import { SWAP_STATUS } from "@/lib/constants";
import { TimeAgo } from "@/components/time-ago";
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
    case SWAP_STATUS.CANCEL_REQUESTED:
      return <Badge variant="warning">รออนุมัติการยกเลิก</Badge>;
    case SWAP_STATUS.REVERTED:
      return <Badge variant="muted">ยกเลิกการสลับแล้ว</Badge>;
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

/** Request to undo an already-approved swap (#1). */
function RequestCancelAction({ id }: { id: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(requestSwapCancelAction, initialActionState);
  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ส่งคำขอยกเลิกแล้ว");
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
        ขอยกเลิกการสลับ
      </Button>
    </form>
  );
}

/** Approve/reject another teacher's cancellation request (#1). */
function DecideCancelActions({ id }: { id: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(decideSwapCancelAction, initialActionState);
  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ดำเนินการแล้ว");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="swapRequestId" value={id} />
      <p className="text-xs text-muted-foreground">ครูอีกฝ่ายขอยกเลิกการสลับนี้</p>
      <div className="flex gap-2">
        <Button type="submit" name="action" value="REJECT" variant="outline" size="sm" disabled={pending}>
          <X />
          ไม่อนุมัติ
        </Button>
        <Button type="submit" name="action" value="APPROVE" size="sm" loading={pending}>
          <Check />
          อนุมัติการยกเลิก
        </Button>
      </div>
    </form>
  );
}

export function SwapList({
  swaps,
  mode,
  viewerTeacherId,
}: {
  swaps: ClientSwap[];
  mode: Mode;
  viewerTeacherId?: string;
}) {
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
        const isParticipant =
          !!viewerTeacherId &&
          (s.requesterId === viewerTeacherId || s.targetTeacherId === viewerTeacherId);
        // Approved swap: any participant may request to undo it.
        const canRequestCancel = s.status === SWAP_STATUS.APPROVED && isParticipant;
        // Cancellation pending: the OTHER participant decides; the requester waits.
        const cancelPending = s.status === SWAP_STATUS.CANCEL_REQUESTED && isParticipant;
        const iRequestedCancel = cancelPending && s.cancelRequestedById === viewerTeacherId;
        return (
          <Card key={s.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.status} />
                  <TimeAgo date={s.createdAt} className="text-xs text-muted-foreground" />
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

              {canRequestCancel && (
                <div className="shrink-0">
                  <RequestCancelAction id={s.id} />
                </div>
              )}
              {cancelPending && !iRequestedCancel && (
                <div className="shrink-0">
                  <DecideCancelActions id={s.id} />
                </div>
              )}
              {iRequestedCancel && (
                <p className="shrink-0 text-xs text-muted-foreground">
                  รอครูอีกฝ่ายอนุมัติการยกเลิก
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
