import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

/** Native select styled to match inputs (works inside server-action forms). */
export function SelectField({
  name,
  label,
  options,
  placeholder = "เลือก…",
  required,
  error,
  defaultValue = "",
}: {
  name: string;
  label: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={Boolean(error)}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
          "aria-[invalid=true]:border-destructive",
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
