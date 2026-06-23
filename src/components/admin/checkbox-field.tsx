import { Label } from "@/components/ui/label";

/** Native checkbox + label, for use inside EntityFormDialog (submits via FormData:
 *  sends "on" when checked, absent when not — matches the Zod preprocess). */
export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="flex items-start gap-2.5">
        <input
          id={name}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="mt-0.5 size-4 shrink-0 rounded border-input text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="space-y-0.5">
          <Label htmlFor={name} className="cursor-pointer font-normal">{label}</Label>
          {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </span>
      </label>
    </div>
  );
}
