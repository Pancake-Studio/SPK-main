import { School } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listClasses } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AddClassDialog } from "@/components/admin/dialogs/add-class-dialog";
import { ClassTable, type ClassRow } from "@/components/admin/class-table";

export const metadata = { title: "จัดการห้องเรียน" };

export default async function AdminClassesPage() {
  await requireAdmin();
  const classes = await listClasses();

  return (
    <div>
      <PageHeader title="จัดการห้องเรียน" description={`ห้องเรียนทั้งหมด ${classes.length} ห้อง`}>
        <AddClassDialog />
      </PageHeader>

      {classes.length === 0 ? (
        <EmptyState icon={School} title="ยังไม่มีห้องเรียน" description="เพิ่มห้องเรียนแรกของคุณ" />
      ) : (
        <ClassTable
          classes={classes.map((c): ClassRow => ({
            id: c.id,
            className: c.className,
            gradeLevel: c.gradeLevel,
            room: c.room,
            studentCount: c._count.students,
            scheduleCount: c._count.schedules,
          }))}
        />
      )}
    </div>
  );
}
