"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { describeReset, KIND_LABEL, type UsageSummary } from "@/lib/quota";
import { cn } from "@/lib/utils";

const TIER_BLURB: Record<string, string> = {
  BETA: "You're on the beta plan — deliberately generous while we're testing.",
  FREE: "You're on the free plan.",
  STUDENT: "You're on the Student plan.",
  TERM: "You're on the Quarter Pass.",
};

/**
 * Settings → Usage.
 *
 * Usage, not Billing: nothing is purchasable yet, and a Billing page with no way to pay
 * is a broken promise. This becomes the billing page later without moving.
 *
 * Shows limits alongside counts. "12" is trivia; "12 of 20, resets in about 6 hours" is
 * something a student can plan around — which is the difference between a limit that
 * feels like a guardrail and one that feels like a trap.
 */
export function UsagePanel() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiClient
      .get<UsageSummary>("/api/me/usage")
      .then((next) => alive && setData(next))
      .catch(() => alive && setError("Couldn't load your usage right now."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg tracking-tight">Usage today</CardTitle>
          {data && (
            <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-foreground">
              {data.tier}
            </span>
          )}
        </div>
        {data && (
          <p className="text-sm text-muted-foreground">
            {TIER_BLURB[data.tier] ?? `You're on the ${data.tier} plan.`} Counts reset{" "}
            {describeReset(data.resetsAt)}.
          </p>
        )}
      </CardHeader>

      <CardContent>
        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && (
          <ul className="space-y-2.5">
            {data.kinds
              // A limit of 0 means "not included on this plan" rather than "you have
              // none left" — listing it as 0 of 0 reads like a bug.
              .filter((k) => k.limit > 0)
              .map(({ kind, used, limit }) => {
                const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                const nearlyOut = limit > 0 && used / limit >= 0.9;
                return (
                  <li key={kind}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-foreground">{KIND_LABEL[kind]}</span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          nearlyOut ? "font-medium text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {used} / {limit}
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          nearlyOut ? "bg-destructive" : "bg-brand",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        )}

        {data && data.kinds.some((k) => k.limit === 0) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Not on this plan:{" "}
            {data.kinds
              .filter((k) => k.limit === 0)
              .map((k) => KIND_LABEL[k.kind].toLowerCase())
              .join(", ")}
            .{" "}
            <Link href="/pricing" className="underline">
              What changes after beta
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
