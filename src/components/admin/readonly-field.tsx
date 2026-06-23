import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Displays a value that must not change during edit (e.g. a code/ID). The
 *  value is shown disabled but still submitted via a hidden input, so saving
 *  keeps it intact and the user can edit other fields freely. */
export function ReadOnlyField({
  name,
  label,
  value,
  hint = "แก้ไขไม่ได้",
}: {
  name: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} disabled readOnly className="cursor-not-allowed bg-muted/60" />
      <input type="hidden" name={name} value={value} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
