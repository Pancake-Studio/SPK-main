import { getCurrentUser } from "@/lib/auth";
import { storeUpload } from "@/server/services/attachment.service";

/** Upload one file (image / PDF). Used by the assignment + submission forms.
 *  Returns { id, filename, mime, size }; link to an assignment/submission
 *  happens later in the relevant server action. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "ไม่พบไฟล์" }, { status: 400 });
  }
  try {
    const stored = await storeUpload(user.id, file);
    return Response.json(stored);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
