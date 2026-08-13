"use client";

import Link from "next/link";
import { ArrowRight, CloudOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  describeReset,
  METER_VISIBLE_AT,
  type QuotaExceeded,
  type QuotaRefusal,
} from "@/lib/quota";

/**
 * "12 of 20 today" — appears only past 70% of the limit.
 *
 * A meter that is always visible turns a generous allowance into a visible ceiling and
 * gets ignored by the time it matters. This appears when it becomes information.
 */
export function UsageMeter({
  used,
  limit,
  className,
}: {
  used: number;
  limit: number;
  className?: string;
}) {
  if (limit <= 0 || used / limit < METER_VISIBLE_AT) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const nearlyOut = used / limit >= 0.9;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1 w-16 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label="Daily usage"
      >
        <div
          className={cn("h-full rounded-full", nearlyOut ? "bg-destructive" : "bg-brand")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn("text-xs", nearlyOut ? "text-destructive" : "text-muted-foreground")}
      >
        {used} of {limit} today
      </span>
    </div>
  );
}

/**
 * You have used up an allowance. A limit, not a fault — so it says when it comes back.
 *
 * Amber/brand, matching every other "attention" surface in the product.
 */
export function LimitReachedCard({
  refusal,
  kindLabel,
  className,
}: {
  refusal: QuotaExceeded;
  kindLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-brand/40 bg-brand/10 px-4 py-3",
        className,
      )}
      role="status"
    >
      <p className="flex items-start gap-2 text-sm font-medium text-brand-foreground">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          You&apos;ve used all {refusal.limit} of today&apos;s {kindLabel.toLowerCase()}.
        </span>
      </p>
      <p className="mt-1 pl-6 text-sm text-brand-foreground/90">
        This resets {describeReset(refusal.resetsAt)}.
        {refusal.tier === "BETA" || refusal.tier === "FREE"
          ? " Everything else still works in the meantime."
          : ""}
      </p>
      {/* No upgrade CTA while nothing is purchasable — a button that cannot be
          honoured is worse than no button. /pricing explains what happens after beta. */}
      <Button asChild size="sm" variant="outline" className="ml-6 mt-2.5">
        <Link href="/pricing">
          See what changes after beta
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

/**
 * OUR problem, not yours. Deliberately a different colour and a different icon from
 * LimitReachedCard.
 *
 * The backend goes to the trouble of returning QUOTA_UNAVAILABLE rather than
 * QUOTA_EXCEEDED precisely so this can be said. If the two states looked alike, a
 * student would read an outage as a paywall and go hunting for an upgrade button to fix
 * something on our side.
 */
export function ServiceDegradedCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3",
        className,
      )}
      role="alert"
    >
      <p className="flex items-start gap-2 text-sm font-medium text-destructive">
        <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>We&apos;re having trouble on our end — this isn&apos;t your usage.</span>
      </p>
      <p className="mt-1 pl-6 text-sm text-muted-foreground">
        Something is wrong with our service, not your account. Please try again in a
        moment; you haven&apos;t used up anything.
      </p>
    </div>
  );
}

/**
 * Renders whichever refusal state applies.
 *
 * Takes the discriminated union directly so the compiler enforces that both cases are
 * handled — the whole point is that these two states never get collapsed.
 */
export function QuotaRefusalCard({
  refusal,
  kindLabel,
  className,
}: {
  refusal: QuotaRefusal;
  kindLabel: string;
  className?: string;
}) {
  if (refusal.kind === "unavailable") {
    return <ServiceDegradedCard className={className} />;
  }
  return (
    <LimitReachedCard refusal={refusal} kindLabel={kindLabel} className={className} />
  );
}
