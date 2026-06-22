"use client";

import * as React from "react";
import { Paperclip, X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  fileHref,
  isImage,
  ACCEPT_ATTACHMENTS,
  type AttachmentMeta,
} from "@/lib/attachment";

/** Uploads images/PDFs to /api/files and reports the stored attachments up via
 *  `onChange`. Linking to an assignment/submission happens server-side later. */
export function FileUpload({
  attachments,
  onChange,
  disabled,
  label = "แนบรูปภาพ / PDF",
}: {
  attachments: AttachmentMeta[];
  onChange: (next: AttachmentMeta[]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    const added: AttachmentMeta[] = [];
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f);
      try {
        const res = await fetch("/api/files", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? `อัปโหลด ${f.name} ไม่สำเร็จ`);
          continue;
        }
        added.push(data as AttachmentMeta);
      } catch {
        toast.error(`อัปโหลด ${f.name} ไม่สำเร็จ`);
      }
    }
    setBusy(false);
    if (added.length) onChange([...attachments, ...added]);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTACHMENTS}
        multiple
        hidden
        onChange={onPick}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
        {label}
      </button>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs"
            >
              {isImage(a.mime) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileHref(a.id)} alt={a.filename} loading="lazy" decoding="async" className="size-8 rounded object-cover" />
              ) : (
                <span className="grid size-8 place-items-center rounded bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
              )}
              <span className="max-w-[120px] truncate text-foreground">{a.filename}</span>
              <button
                type="button"
                onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
                className="text-muted-foreground hover:text-destructive"
                aria-label="ลบไฟล์"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
