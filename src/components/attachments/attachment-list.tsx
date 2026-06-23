"use client";

import * as React from "react";
import { FileText, X, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fileHref, isImage, isPdf, humanSize, type AttachmentMeta } from "@/lib/attachment";
import { cn } from "@/lib/utils";

/** Row of attachment chips. Clicking one opens an in-app preview card (image
 *  shown inline, PDF in an embedded viewer) — no navigating away to the file
 *  URL, so the back button keeps working (important on mobile/PWA).
 *  Pass `onRemove` to show a delete (×) on each chip. */
export function AttachmentList({
  attachments,
  onRemove,
}: {
  attachments: AttachmentMeta[];
  onRemove?: (id: string) => void;
}) {
  const [active, setActive] = React.useState<AttachmentMeta | null>(null);
  if (!attachments?.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {attachments.map((a) => (
          <div
            key={a.id}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs transition-colors hover:border-primary/50"
          >
            <button
              type="button"
              onClick={() => setActive(a)}
              title={`ดู ${a.filename}`}
              className="inline-flex min-w-0 items-center gap-2"
            >
              {isImage(a.mime) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileHref(a.id)}
                  alt={a.filename}
                  loading="lazy"
                  decoding="async"
                  className="size-8 rounded object-cover"
                />
              ) : (
                <span className="grid size-8 place-items-center rounded bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
              )}
              <span className="max-w-[140px] truncate text-foreground">{a.filename}</span>
              <span className="shrink-0 text-muted-foreground">{humanSize(a.size)}</span>
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="ลบไฟล์"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent
          className={cn(
            // never exceed the viewport (fixes image/PDF spilling off-screen);
            // tighter padding to leave more room for the preview.
            "w-[95vw] gap-2 overflow-hidden p-3 sm:p-4",
            active && isPdf(active.mime) ? "max-w-4xl" : "max-w-3xl",
          )}
        >
          {active && (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle className="truncate">{active.filename}</DialogTitle>
                <DialogDescription>{humanSize(active.size)}</DialogDescription>
              </DialogHeader>

              {isImage(active.mime) ? (
                <div className="flex max-h-[75vh] justify-center overflow-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileHref(active.id)}
                    alt={active.filename}
                    className="h-auto max-h-[75vh] w-auto max-w-full rounded-md object-contain"
                  />
                </div>
              ) : isPdf(active.mime) ? (
                // Full PDF in the browser viewer (scroll through every page).
                <object
                  data={fileHref(active.id)}
                  type="application/pdf"
                  className="h-[80vh] max-h-[80vh] w-full rounded-md border border-border"
                >
                  <iframe
                    src={fileHref(active.id)}
                    title={active.filename}
                    className="h-[80vh] w-full rounded-md border border-border"
                  />
                </object>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">ดูตัวอย่างไฟล์นี้ไม่ได้</p>
              )}

              <a
                href={fileHref(active.id)}
                download={active.filename}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Download className="size-4" /> ดาวน์โหลด / เปิดเต็มหน้า
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
