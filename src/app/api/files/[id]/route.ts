import { getCurrentUser } from "@/lib/auth";
import { getAttachmentForDownload } from "@/server/services/attachment.service";

/** Serve a stored file inline, enforcing per-file access control. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const file = await getAttachmentForDownload(id, user.id);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
