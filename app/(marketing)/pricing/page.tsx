"use client";

import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * /pricing — published before anything is purchasable.
 *
 * Invitees will ask "will this end up costing me?", and the honest answer is worth
 * stating plainly rather than leaving them to guess. It also gives the landing page and
 * the limit-reached card a real destination instead of a dead upgrade button.
 *
 * Deliberately has no checkout. A "Subscribe" button that cannot charge anyone is worse
 * than none: it makes the rest of the page untrustworthy.
 *
 * Prices are the ones in docs/paid-model-design.md, including the quarter figure
 * corrected for UCSD's ~10-week terms — a $25 "term pass" would have been a worse deal
 * than paying monthly, which would have made the whole option pointless.
 */

type Row = { label: string; free: string; student: string };

const ROWS: Row[] = [
  { label: "Quick Help (no setup needed)", free: "10 / day", student: "200 / day" },
  { label: "Course chat with citations", free: "10 / day", student: "200 / day" },
  { label: "Uploads", free: "5 / day", student: "50 / day" },
  { label: "Scanned pages processed", free: "15 / day", student: "60 / day" },
  { label: "What this professor tests", free: "included", student: "included" },
  { label: "Study guides", free: "—", student: "10 / day" },
  { label: "Deeper-reasoning re-runs", free: "—", student: "10 / month" },
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-brand/40 bg-brand/10 px-5 py-4">
        <p className="text-sm font-semibold text-brand-foreground">
          Everything is free during the beta.
        </p>
        <p className="mt-1 text-sm text-brand-foreground/90">
          Nothing on this page is purchasable yet, and we will not ask for a card during
          the beta. Beta testers keep <strong>6 months of Student free</strong> when
          paid plans start.
        </p>
      </div>

      <h1 className="mt-10 text-3xl font-bold tracking-tight">What this will cost later</h1>
      <p className="mt-2 text-muted-foreground">
        Published early so you can decide whether it&apos;s worth your time now. These
        numbers may move before launch; the free tier will stay genuinely usable.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <caption className="sr-only">Plan comparison</caption>
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">
                &nbsp;
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">
                Free
                <span className="block text-xs font-normal text-muted-foreground">
                  always
                </span>
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">
                Student
                <span className="block text-xs font-normal text-muted-foreground">
                  $9 / month · $19 / quarter · $45 / year
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 ? "bg-muted/20" : ""}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  {row.label}
                </th>
                {[row.free, row.student].map((cell, j) => (
                  <td key={j} className="px-4 py-2.5 text-muted-foreground">
                    {cell === "—" ? (
                      <span className="inline-flex items-center gap-1">
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">not included</span>
                      </span>
                    ) : cell === "included" ? (
                      <span className="inline-flex items-center gap-1 text-grounded">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> included
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 space-y-4 text-sm text-muted-foreground">
        <div>
          <h2 className="font-semibold text-foreground">Why a quarter option</h2>
          <p className="mt-1">
            Most study tools get bought the week before an exam and cancelled after. A
            quarter costs less than paying monthly for the same 10 weeks, so you
            don&apos;t have to think about it again mid-term.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Why the free tier is real</h2>
          <p className="mt-1">
            Answering a question costs us a fraction of a cent, so the free limits exist
            to stop scripts and runaway uploads — not to push you into paying. The one
            genuinely expensive operation is reading scanned pages, which is why that
            allowance is the smallest.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Your material stays yours</h2>
          <p className="mt-1">
            You can read your own uploads and past conversations on any plan, including
            after a subscription ends. Deleting your account removes your uploads from
            our storage as well as our database.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={isAuthenticated ? "/dashboard" : "/register"}>
            {isAuthenticated ? "Back to my dashboard" : "Start free — no card"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
