"use client";

import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataSyncButton({ tab, label = "Sync Excel" }: { tab: string; label?: string }) {
  return (
    <Button variant="outline" asChild>
      <Link href={`/admin/data-sync?tab=${tab}`}>
        <FileSpreadsheet />
        {label}
      </Link>
    </Button>
  );
}
