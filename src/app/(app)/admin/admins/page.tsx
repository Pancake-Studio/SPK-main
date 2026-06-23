import { requireAdmin } from "@/lib/auth";
import { listAdmins } from "@/server/services/admin.service";
import { PageHeader } from "@/components/page-header";
import { AddAdminDialog } from "@/components/admin/dialogs/add-admin-dialog";
import { AdminUserTable, type AdminRow } from "@/components/admin/admin-user-table";

export const metadata = { title: "ผู้ดูแลระบบ" };

export default async function AdminAdminsPage() {
  const me = await requireAdmin();
  const admins = await listAdmins();

  return (
    <div>
      <PageHeader title="ผู้ดูแลระบบ" description={`ผู้ดูแลระบบทั้งหมด ${admins.length} คน`}>
        <AddAdminDialog />
      </PageHeader>

      <AdminUserTable
        admins={admins.map((a): AdminRow => ({
          id: a.id,
          name: a.name,
          email: a.email,
          isYou: a.id === me.id,
        }))}
      />
    </div>
  );
}
