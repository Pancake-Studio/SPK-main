"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { TimeAgo } from "@/components/time-ago";
import { decideDelegationAction } from "@/server/actions/delegation.actions";
import { initialActionState } from "@/server/actions/_helpers";
import type { DelegationClient } from "@/server/services/delegation.service";

type Mode = "owned" | "covering";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="success">กำลังฝาก</Badge>;
    case "DECLINED":
      return <Badge variant="muted">ครูปฏิเสธ</Badge>;
    case "CANCELLED":
      return <Badge variant="muted">ยกเลิกแล้ว</Badge>;
    default:
      return <Badge variant="muted">{status}</Badge>;
  }
}

function EndAction({ id, action, label }: { id: string; action: "CANCEL" | "DECLINE"; label: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(decideDelegationAction, initialActionState);
  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ดำเนินการแล้ว");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="delegationId" value={id} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        {action === "CANCEL" ? <Ban /> : <X />}
        {label}
      </Button>
    </form>
  );
}

export function DelegationList({ items, mode }: { items: DelegationClient[]; mode: Mode }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Share2}
        title={mode === "owned" ? "ยังไม่มีการฝากคาบ" : "ยังไม่มีคาบที่รับฝาก"}
        description={
          mode === "owned"
            ? "คาบที่คุณฝากให้ครูท่านอื่นคุมแทนจะปรากฏที่นี่"
            : "เมื่อมีครูฝากคาบให้คุณคุมแทน จะปรากฏที่นี่"
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((d) => {
        const active = d.status === "ACTIVE";
        return (
          <Card key={d.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={d.status} />
                  <Badge variant="muted">เฉพาะสัปดาห์ {d.weekLabel}</Badge>
                  <TimeAgo date={d.createdAt} className="text-xs text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {mode === "owned" ? (
                    <>
                      ฝากให้ <span className="font-medium text-foreground">{d.toTeacherName}</span> คุมแทน
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">{d.fromTeacherName}</span> ฝากให้คุณคุมแทน
                    </>
                  )}
                </p>
                <div className="rounded-md bg-muted/50 p-3 text-sm font-medium text-foreground">
                  {d.slotLabel}
                </div>
                {d.reason && <p className="text-sm text-muted-foreground">เหตุผล: {d.reason}</p>}
              </div>

              {active && (
                <div className="shrink-0">
                  {mode === "owned" ? (
                    <EndAction id={d.id} action="CANCEL" label="ยกเลิกการฝาก" />
                  ) : (
                    <EndAction id={d.id} action="DECLINE" label="ปฏิเสธการรับฝาก" />
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
