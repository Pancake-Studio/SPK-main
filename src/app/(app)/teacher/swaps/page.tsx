import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { requireTeacherProfile } from "@/lib/auth";
import {
  getSwapsForTeacher,
  mapSwapToClient,
} from "@/server/services/swap.service";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwapList } from "@/components/swap/swap-list";
import { SWAP_STATUS } from "@/lib/constants";

export const metadata = { title: "แลกคาบสอน" };

export default async function TeacherSwapsPage() {
  const { teacher } = await requireTeacherProfile();
  const swaps = await getSwapsForTeacher(teacher.id);

  const incoming = swaps.incoming.map(mapSwapToClient);
  const outgoing = swaps.outgoing.map(mapSwapToClient);
  const pendingIncoming = swaps.incoming.filter((s) => s.status === SWAP_STATUS.PENDING).length;

  return (
    <div>
      <PageHeader
        title="แลกคาบสอน"
        description="ส่งคำขอแลกคาบ และจัดการคำขอที่เข้ามา"
      >
        <Button asChild>
          <Link href="/teacher/swaps/new">
            <ArrowLeftRight />
            ขอแลกคาบสอน
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming" className="gap-2">
            คำขอเข้ามา
            {pendingIncoming > 0 && <Badge variant="warning">{pendingIncoming}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="outgoing">คำขอที่ส่ง</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming">
          <SwapList swaps={incoming} mode="incoming" viewerTeacherId={teacher.id} />
        </TabsContent>
        <TabsContent value="outgoing">
          <SwapList swaps={outgoing} mode="outgoing" viewerTeacherId={teacher.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
