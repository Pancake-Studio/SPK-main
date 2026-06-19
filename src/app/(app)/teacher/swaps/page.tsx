import { requireTeacherProfile } from "@/lib/auth";
import {
  getTeacherSchedule,
  getTeachersWithSchedules,
} from "@/server/services/schedule.service";
import {
  getSwapsForTeacher,
  mapSwapToClient,
} from "@/server/services/swap.service";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SwapList } from "@/components/swap/swap-list";
import { SwapRequestDialog } from "@/components/swap/swap-request-dialog";
import { SWAP_STATUS } from "@/lib/constants";

export const metadata = { title: "แลกคาบสอน" };

export default async function TeacherSwapsPage() {
  const { teacher } = await requireTeacherProfile();
  const [slots, others, swaps] = await Promise.all([
    getTeacherSchedule(teacher.id),
    getTeachersWithSchedules(teacher.id),
    getSwapsForTeacher(teacher.id),
  ]);

  const incoming = swaps.incoming.map(mapSwapToClient);
  const outgoing = swaps.outgoing.map(mapSwapToClient);
  const pendingIncoming = swaps.incoming.filter((s) => s.status === SWAP_STATUS.PENDING).length;

  return (
    <div>
      <PageHeader
        title="แลกคาบสอน"
        description="ส่งคำขอแลกคาบ และจัดการคำขอที่เข้ามา"
      >
        <SwapRequestDialog mySlots={slots} teachers={others} />
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
          <SwapList swaps={incoming} mode="incoming" />
        </TabsContent>
        <TabsContent value="outgoing">
          <SwapList swaps={outgoing} mode="outgoing" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
