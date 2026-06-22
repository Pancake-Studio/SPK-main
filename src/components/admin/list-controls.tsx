"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Search box that pushes `?q=` (and resets `page`) on submit — server then
 *  renders only the matching page of rows. */
export function ListSearch({ placeholder = "ค้นหา…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = (new FormData(e.currentTarget).get("q")?.toString() ?? "").trim();
    const params = new URLSearchParams(sp.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input name="q" defaultValue={sp.get("q") ?? ""} placeholder={placeholder} className="h-10 pl-9" />
    </form>
  );
}

/** Prev/Next pagination that pushes `?page=`. */
export function PaginationBar({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function go(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (total === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        ทั้งหมด {total} รายการ · หน้า {page}/{pageCount}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>
          <ChevronLeft className="size-4" /> ก่อนหน้า
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => go(page + 1)}>
          ถัดไป <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
