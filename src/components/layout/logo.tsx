import Image from "next/image";
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
      <Image src="/icon-spk.png" alt="Logo" width={36} height={36} />
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
