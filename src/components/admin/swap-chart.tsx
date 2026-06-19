"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/empty-state";
import { ArrowLeftRight } from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: "รออนุมัติ", color: "#EAB308" },
  APPROVED: { label: "อนุมัติ", color: "#22C55E" },
  REJECTED: { label: "ปฏิเสธ", color: "#EF4444" },
  CANCELLED: { label: "ยกเลิก", color: "#9CA3AF" },
};

export function SwapChart({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(STATUS_META).map(([key, meta]) => ({
    name: meta.label,
    value: data[key] ?? 0,
    color: meta.color,
  }));
  const total = rows.reduce((a, r) => a + r.value, 0);

  if (total === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="ยังไม่มีข้อมูลการแลกคาบ"
        description="กราฟจะแสดงเมื่อมีคำขอแลกคาบในระบบ"
      />
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-popover)",
              color: "var(--color-popover-foreground)",
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {rows.map((r) => (
              <Cell key={r.name} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
