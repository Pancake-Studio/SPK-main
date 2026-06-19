import { GraduationCap } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listStudents, listClasses } from "@/server/services/admin.service";
import { deleteStudentAction } from "@/server/actions/admin.actions";
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
import { AddStudentDialog } from "@/components/admin/dialogs/add-student-dialog";
import { DeleteButton } from "@/components/admin/delete-button";

export const metadata = { title: "จัดการนักเรียน" };

export default async function AdminStudentsPage() {
  await requireAdmin();
  const [students, classes] = await Promise.all([listStudents(), listClasses()]);
  const classOptions = classes.map((c) => ({ value: c.id, label: c.className }));

  return (
    <div>
      <PageHeader title="จัดการนักเรียน" description={`นักเรียนทั้งหมด ${students.length} คน`}>
        <AddStudentDialog classes={classOptions} />
      </PageHeader>

      {students.length === 0 ? (
        <EmptyState icon={GraduationCap} title="ยังไม่มีนักเรียนในระบบ" description="เพิ่มนักเรียน หรือนำเข้าจากไฟล์" />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>ห้องเรียน</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.studentCode}</TableCell>
                  <TableCell className="font-medium text-foreground">{s.user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.class.className}</Badge>
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      id={s.id}
                      action={deleteStudentAction}
                      confirmText={`ลบนักเรียน ${s.user.name}?`}
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
