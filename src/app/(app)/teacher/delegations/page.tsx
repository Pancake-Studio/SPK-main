import Link from "next/link";
import { Share2 } from "lucide-react";
import { requireTeacherProfile } from "@/lib/auth";
import {
  getDelegationsForTeacher,
  mapDelegationToClient,
} from "@/server/services/delegation.service";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DelegationList } from "@/components/swap/delegation-list";

export const metadata = { title: "ฝากคาบสอน" };

export default async function TeacherDelegationsPage() {
  const { teacher } = await requireTeacherProfile();
  const { owned, covering } = await getDelegationsForTeacher(teacher.id);

  const ownedClient = owned.map(mapDelegationToClient);
  const coveringClient = covering.map(mapDelegationToClient);
  const activeCovering = coveringClient.filter((d) => d.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="ฝากคาบสอน"
        description="ฝากคาบให้ครูที่ว่างมาคุมแทนเฉพาะสัปดาห์ที่เลือก โดยไม่ต้องแลกคาบ"
      >
        <Button asChild>
          <Link href="/teacher/delegations/new">
            <Share2 />
            ฝากคาบ
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="covering">
        <TabsList>
          <TabsTrigger value="covering" className="gap-2">
            คาบที่รับฝาก
            {activeCovering > 0 && <Badge variant="success">{activeCovering}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="owned">คาบที่ฝากไป</TabsTrigger>
        </TabsList>
        <TabsContent value="covering">
          <DelegationList items={coveringClient} mode="covering" />
        </TabsContent>
        <TabsContent value="owned">
          <DelegationList items={ownedClient} mode="owned" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
