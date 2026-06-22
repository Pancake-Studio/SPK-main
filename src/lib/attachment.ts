// Client-safe attachment helpers (shared by server services + client UI).

export type AttachmentMeta = { id: string; filename: string; mime: string; size: number };

/** Authenticated download/serve URL for a stored attachment. */
export function fileHref(id: string): string {
  return `/api/files/${id}`;
}

export function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isPdf(mime: string): boolean {
  return mime === "application/pdf";
}

/** Human-readable size, e.g. "1.4 MB". */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ACCEPT_ATTACHMENTS = "image/png,image/jpeg,image/webp,image/gif,application/pdf";
