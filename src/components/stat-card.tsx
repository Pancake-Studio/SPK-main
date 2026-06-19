import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent = "primary" | "gold" | "success" | "info" | "destructive";

const ACCENTS: Record<Accent, string> = {
  primary: "bg-secondary text-primary",
  gold: "bg-gold/15 text-gold-foreground dark:text-yellow",
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  destructive: "bg-destructive/15 text-destructive",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  hint,
  href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: Accent;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <Card
      className={cn(
        "flex items-center gap-4 p-5 transition-colors",
        href && "hover:border-primary/40 hover:bg-muted/30",
      )}
    >
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-lg", ACCENTS[accent])}>
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
