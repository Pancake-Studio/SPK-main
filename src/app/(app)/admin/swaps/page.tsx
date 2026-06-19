import { requireAdmin } from "@/lib/auth";
import { getAllSwaps, mapSwapToClient } from "@/server/services/swap.service";
import { PageHeader } from "@/components/page-header";
import { SwapList } from "@/components/swap/swap-list";
import { SWAP_STATUS } from "@/lib/constants";

export const metadata = { title: "คำขอแลกคาบ" };

export default async function AdminSwapsPage() {
  await requireAdmin();
  const swaps = await getAllSwaps();
  const all = swaps.map(mapSwapToClient);
  const pending = all.filter((s) => s.status === SWAP_STATUS.PENDING);

  return (
    <div>
      <PageHeader
        title="คำขอแลกคาบ"
        description={`ทั้งหมด ${all.length} รายการ · รออนุมัติ ${pending.length} รายการ`}
      />
      <SwapList swaps={all} mode="admin" />
    </div>
  );
}
