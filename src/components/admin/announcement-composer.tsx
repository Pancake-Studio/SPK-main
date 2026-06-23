"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SelectField } from "@/components/admin/select-field";
import { RichTextEditor } from "@/components/rich-text-editor";
import { createAnnouncementAction } from "@/server/actions/admin.actions";
import { initialActionState, type ActionState } from "@/server/actions/_helpers";

const audienceOptions = [
  { value: "ALL", label: "ทุกคน" },
  { value: "TEACHERS", label: "เฉพาะครู" },
  { value: "STUDENTS", label: "เฉพาะนักเรียน" },
];

/** Reusable announcement form. `action` lets admins and teachers share it. */
export function AnnouncementComposer({
  action = createAnnouncementAction,
}: {
  action?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [editorKey, setEditorKey] = React.useState(0);

  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "ประกาศแล้ว");
      formRef.current?.reset();
      setEditorKey((k) => k + 1);
      router.refresh();
    } else if (state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>สร้างประกาศใหม่</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">หัวข้อ</Label>
            <Input id="title" name="title" placeholder="หัวข้อประกาศ" aria-invalid={Boolean(state.fieldErrors?.title)} />
            {state.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">เนื้อหา</Label>
            <RichTextEditor key={editorKey} name="body" placeholder="รายละเอียดประกาศ…" />
            {state.fieldErrors?.body && <p className="text-xs text-destructive">{state.fieldErrors.body}</p>}
          </div>

          <div className="grid items-end gap-4 sm:grid-cols-2">
            <SelectField name="audience" label="ส่งถึง" options={audienceOptions} defaultValue="ALL" />
            <label className="flex h-11 items-center gap-3 rounded-md border border-border px-3">
              <Switch name="isUrgent" value="true" />
              <span className="text-sm text-foreground">ทำเครื่องหมายว่าด่วน (Emergency)</span>
            </label>
          </div>

          <Button type="submit" loading={pending}>
            <Send />
            เผยแพร่ประกาศ
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
