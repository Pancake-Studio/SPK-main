import { BookOpen } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listSubjects } from "@/server/services/admin.service";
import { deleteSubjectAction } from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { AddSubjectDialog } from "@/components/admin/dialogs/add-subject-dialog";
import { DeleteButton } from "@/components/admin/delete-button";

export const metadata = { title: "จัดการวิชา" };

export default async function AdminSubjectsPage() {
  await requireAdmin();
  const subjects = await listSubjects();

  return (
    <div>
      <PageHeader title="จัดการวิชา" description={`วิชาทั้งหมด ${subjects.length} วิชา`}>
        <AddSubjectDialog />
      </PageHeader>

      {subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="ยังไม่มีวิชา" description="เพิ่มวิชาแรกของคุณ" />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>ชื่อวิชา</TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead className="text-center">คาบสอน</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span
                      className="block size-5 rounded-full border border-border"
                      style={{ backgroundColor: s.colorHex ?? "var(--color-primary)" }}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{s.subjectName}</TableCell>
                  <TableCell className="font-mono text-xs">{s.subjectCode}</TableCell>
                  <TableCell className="text-center">{s._count.schedules}</TableCell>
                  <TableCell>
                    <DeleteButton id={s.id} action={deleteSubjectAction} confirmText={`ลบวิชา ${s.subjectName}?`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
