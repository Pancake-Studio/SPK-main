import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AssignmentsClassLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-2 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
