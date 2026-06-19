import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, SCHOOL_NAME } from "@/lib/constants";

export function Logo({
  className,
  withText = true,
}: {
  className?: string;
  withText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="size-5" />
      </span>
      {withText && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </span>
          <span className="text-xs text-muted-foreground">{SCHOOL_NAME}</span>
        </span>
      )}
    </div>
  );
}
