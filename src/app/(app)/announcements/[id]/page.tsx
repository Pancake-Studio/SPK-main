import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SafeHtml } from "@/components/safe-html";
import { ROLES, ROLE_HOME, type Role } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "ประกาศ" };

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: "ทุกคน",
  TEACHERS: "เฉพาะครู",
  STUDENTS: "เฉพาะนักเรียน",
};

function canView(role: Role, audience: string): boolean {
  if (role === ROLES.ADMIN || audience === "ALL") return true;
  if (audience === "TEACHERS") return role === ROLES.TEACHER;
  if (audience === "STUDENTS") return role === ROLES.STUDENT;
  return false;
}

export default async function AnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const announcement = await db.announcement.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  });

  if (!announcement || !canView(user.role, announcement.audience)) notFound();

  return (
    <div>
      <PageHeader title="ประกาศ" description="รายละเอียดประกาศ">
        <Link
          href={(ROLE_HOME as Record<string, string>)[user.role] ?? "/dashboard"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          กลับ
        </Link>
      </PageHeader>

      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            {announcement.isUrgent && <Badge variant="destructive">ด่วน</Badge>}
            <Badge variant="secondary">
              {AUDIENCE_LABEL[announcement.audience] ?? announcement.audience}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {timeAgo(announcement.createdAt)}
            </span>
          </div>

          <div className="mt-3 flex items-start gap-2">
            <Megaphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">{announcement.title}</h1>
          </div>

          {/* Option 1: Using SafeHtml component */}
          <SafeHtml
            html={announcement.body}
            className="prose prose-sm mt-4 max-w-none text-foreground dark:prose-invert"
          />

          {/* Option 2: Direct dangerouslySetInnerHTML (for debugging) */}
          {/* 
          <div
            className="prose prose-sm mt-4 max-w-none text-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: announcement.body }}
          />
          */}

          <p className="mt-6 text-xs text-muted-foreground">
            โดย {announcement.author.name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}