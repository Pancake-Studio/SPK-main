import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PushSettings } from "@/components/pwa/push-settings";
import { getInitials } from "@/lib/utils";
import { roleLabel } from "@/lib/role";

export const metadata = { title: "ตั้งค่า" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="โปรไฟล์และการตั้งค่า" description="จัดการบัญชีและความปลอดภัยของคุณ" />

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลบัญชี</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="size-14 text-base">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="secondary">{roleLabel(user.role)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
          <CardDescription>ใช้รหัสผ่านที่คาดเดายาก อย่างน้อย 8 ตัวอักษร</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>การแจ้งเตือน</CardTitle>
          <CardDescription>เปิดการแจ้งเตือนบนอุปกรณ์นี้ และทดสอบว่าทำงาน</CardDescription>
        </CardHeader>
        <CardContent>
          <PushSettings />
        </CardContent>
      </Card>
    </div>
  );
}
