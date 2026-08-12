"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  /** Optional mark so an empty pane reads as designed rather than unfinished. */
  icon?: LucideIcon;
  /** One line explaining what the action will get them. */
  hint?: string;
}

/**
 * Shared empty state.
 *
 * Was text + button. An empty pane is often a student's first view of a feature,
 * so it carries real explanatory weight — the exam-insights empty state already
 * did this properly (icon + why + a specific CTA), and this brings the shared
 * component up to that bar so every other surface can match without rewriting it.
 */
export function EmptyState({
  message,
  actionLabel,
  onAction,
  icon: Icon,
  hint,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="mb-3 rounded-2xl border bg-card p-3 shadow-sm">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <p className="font-medium text-foreground">{message}</p>
      {hint && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>
      )}
      <Button onClick={onAction} className="mt-4">
        {actionLabel}
      </Button>
    </div>
  );
}
