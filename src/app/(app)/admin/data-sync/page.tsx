import { requireAdmin } from "@/lib/auth";
import { DataSyncPage } from "@/components/admin/data-sync-page";
import { ENTITY_KEYS } from "@/lib/constants";

export const metadata = { title: "Sync Excel" };

export default async function AdminDataSyncPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }> | { tab?: string };
}) {
  await requireAdmin();
  const { tab } = await searchParams;
  const defaultTab = ENTITY_KEYS.includes(tab as typeof ENTITY_KEYS[number]) ? tab : "teachers";
  return <DataSyncPage defaultTab={defaultTab ?? "teachers"} />;
}
