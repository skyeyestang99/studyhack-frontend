"use client";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="mb-4 text-muted-foreground">{message}</p>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}
