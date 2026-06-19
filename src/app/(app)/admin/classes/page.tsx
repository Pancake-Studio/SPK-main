import { School } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listClasses } from "@/server/services/admin.service";
import { deleteClassAction } from "@/server/actions/admin.actions";
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
import { AddClassDialog } from "@/components/admin/dialogs/add-class-dialog";
import { DeleteButton } from "@/components/admin/delete-button";

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
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ห้อง</TableHead>
                <TableHead>ระดับชั้น</TableHead>
                <TableHead>อาคาร/ห้อง</TableHead>
                <TableHead className="text-center">นักเรียน</TableHead>
                <TableHead className="text-center">คาบเรียน</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-foreground">{c.className}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.gradeLevel}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.room ?? "-"}</TableCell>
                  <TableCell className="text-center">{c._count.students}</TableCell>
                  <TableCell className="text-center">{c._count.schedules}</TableCell>
                  <TableCell>
                    <DeleteButton id={c.id} action={deleteClassAction} confirmText={`ลบห้อง ${c.className}?`} />
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
