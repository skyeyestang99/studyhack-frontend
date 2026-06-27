"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
