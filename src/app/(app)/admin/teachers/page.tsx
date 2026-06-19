import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listTeachers } from "@/server/services/admin.service";
import { deleteTeacherAction } from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { AddTeacherDialog } from "@/components/admin/dialogs/add-teacher-dialog";
import { DeleteButton } from "@/components/admin/delete-button";

export const metadata = { title: "จัดการครู" };

export default async function AdminTeachersPage() {
  await requireAdmin();
  const teachers = await listTeachers();

  return (
    <div>
      <PageHeader title="จัดการครู" description={`ครูทั้งหมด ${teachers.length} คน`}>
        <AddTeacherDialog />
      </PageHeader>

      {teachers.length === 0 ? (
        <EmptyState icon={Users} title="ยังไม่มีครูในระบบ" description="เริ่มต้นด้วยการเพิ่มครูคนแรก" />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>กลุ่มสาระ</TableHead>
                <TableHead className="text-center">คาบสอน</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.teacherCode}</TableCell>
                  <TableCell className="font-medium text-foreground">
                    {t.title ? `${t.title} ` : ""}
                    {t.user.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.user.email}</TableCell>
                  <TableCell>
                    {t.department ? <Badge variant="secondary">{t.department}</Badge> : "-"}
                  </TableCell>
                  <TableCell className="text-center">{t._count.schedules}</TableCell>
                  <TableCell>
                    <DeleteButton
                      id={t.id}
                      action={deleteTeacherAction}
                      confirmText={`ลบครู ${t.user.name}? บัญชีและคาบสอนที่เกี่ยวข้องจะถูกลบ`}
                    />
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
