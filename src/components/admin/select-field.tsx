import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; disabled?: boolean };

/** Native select styled to match inputs (works inside server-action forms).
 *  Pass `value` + `onValueChange` to use it controlled (e.g. for dependent
 *  fields); otherwise it stays uncontrolled via `defaultValue`. */
export function SelectField({
  name,
  label,
  options,
  placeholder = "เลือก…",
  required,
  error,
  defaultValue = "",
  value,
  onValueChange,
  disabled,
  hint,
}: {
  name: string;
  label: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const controlled = value !== undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <select
        id={name}
        name={name}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...(controlled
          ? { value, onChange: (e) => onValueChange?.(e.target.value) }
          : { defaultValue })}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
          "aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
