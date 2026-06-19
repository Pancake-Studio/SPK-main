import { Megaphone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listAnnouncements } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { AnnouncementComposer } from "@/components/admin/announcement-composer";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "ประกาศ" };

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: "ทุกคน",
  TEACHERS: "เฉพาะครู",
  STUDENTS: "เฉพาะนักเรียน",
};

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const announcements = await listAnnouncements();

  return (
    <div>
      <PageHeader title="ประกาศ" description="กระจายข่าวสารถึงครูและนักเรียน" />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <AnnouncementComposer />
        </div>

        <div className="lg:col-span-3">
          {announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="ยังไม่มีประกาศ" description="ประกาศที่เผยแพร่จะปรากฏที่นี่" />
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.isUrgent && <Badge variant="destructive">ด่วน</Badge>}
                      <Badge variant="secondary">{AUDIENCE_LABEL[a.audience] ?? a.audience}</Badge>
                      <span className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
                    </div>
                    <h3 className="mt-2 font-semibold text-foreground">{a.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                    <p className="mt-3 text-xs text-muted-foreground">โดย {a.author.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
