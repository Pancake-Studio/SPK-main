import { Skeleton } from "@/components/ui/skeleton";

/** Instant route-transition placeholder for every signed-in page. Shows the
 *  moment a user navigates, so the app always feels responsive while the next
 *  page's data loads on the server. */
export default function AppLoading() {
  return (
    <div className="animate-in fade-in duration-200" aria-busy aria-label="กำลังโหลด">
      {/* Page header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Content block */}
      <div className="mt-6 space-y-3 rounded-xl border border-border p-4">
        <Skeleton className="h-10 w-full max-w-xs" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
