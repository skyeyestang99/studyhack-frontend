"use client";

import Link from "next/link";
import { Check, ChevronRight, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Activation checklist.
 *
 * Once asking a question no longer requires setup, users need a path back to the
 * parts that make answers course-specific — otherwise Quick Help becomes a
 * dead-end and the product is just another chatbot. This is the funnel made
 * visible: pull rather than the onboarding wall's push.
 *
 * State is derived from real data (courses, uploads, assessments) rather than
 * stored flags, so it cannot drift out of sync with what the account actually has,
 * and it self-heals if a user deletes a course.
 *
 * Hides itself once complete: a permanently checked-off list is clutter.
 */
export function SetupProgress({
  askedQuestion,
  courseCount,
  materialCount,
  assessmentCount,
  firstCourseId,
}: {
  askedQuestion: boolean;
  courseCount: number;
  materialCount: number;
  assessmentCount: number;
  firstCourseId?: string;
}) {
  const steps = [
    { label: "Ask a question", done: askedQuestion, href: undefined },
    { label: "Add your course", done: courseCount > 0, href: "/onboarding" },
    {
      label: "Upload course materials",
      done: materialCount > 0,
      href: firstCourseId ? `/courses/${firstCourseId}/materials` : "/onboarding",
    },
    {
      label: "See what your professor tests",
      done: assessmentCount > 0,
      href: firstCourseId ? `/courses/${firstCourseId}` : "/onboarding",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  // The first incomplete step is the only one worth a call to action; showing four
  // competing links is how a checklist becomes noise.
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Finish setting up</p>
          <span className="text-xs text-muted-foreground">
            {doneCount} of {steps.length}
          </span>
        </div>

        <div
          className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-label="Setup progress"
        >
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>

        <ol className="space-y-1.5">
          {steps.map((step, i) => {
            const isNext = i === nextIndex;
            const content = (
              <span
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                  step.done && "text-muted-foreground",
                  isNext && "bg-brand/10 font-medium text-foreground",
                  !step.done && !isNext && "text-muted-foreground",
                )}
              >
                {step.done ? (
                  <Check className="h-4 w-4 shrink-0 text-grounded" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 opacity-40" aria-hidden="true" />
                )}
                <span className={cn("flex-1", step.done && "line-through")}>
                  {step.label}
                </span>
                {isNext && step.href && (
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
              </span>
            );

            return (
              <li key={step.label}>
                {isNext && step.href ? (
                  <Link href={step.href} className="block hover:opacity-80">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
