import { FileText, Target } from "lucide-react";

/**
 * Static illustration of a grounded answer, for the landing page.
 *
 * Deliberately hand-built JSX rather than a screenshot: a screenshot goes stale
 * the moment the UI changes, can't adapt to dark mode, ships a large image on the
 * critical path, and can't be read by a screen reader. This renders with the same
 * tokens as the real product, so it cannot misrepresent it for long.
 *
 * The content mirrors a real verified answer from the seeded MATH 20C corpus
 * (Prof. Vavalis) rather than invented marketing copy — including the citation
 * filenames and page numbers, which are the actual point being demonstrated.
 */
export function GroundedAnswerDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <span className="text-xs font-semibold text-muted-foreground">MATH 20C</span>
        <span className="text-xs text-muted-foreground">· Prof. Vavalis</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-grounded/40 bg-grounded/10 px-2 py-0.5 text-xs font-medium text-grounded-foreground">
          <span aria-hidden="true">✓</span> From your materials
        </span>
      </div>

      <div className="space-y-3 px-4 py-4">
        <p className="text-sm font-medium text-foreground">
          How should I set up a Lagrange multiplier problem for the midterm?
        </p>

        <div className="space-y-2 rounded-xl bg-muted/30 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Approach</span> — Your
            instructor consistently frames these as real-world optimisation with{" "}
            <em>two</em> constraints, so start by naming the objective and each
            constraint separately before differentiating.
          </p>
          <p>
            Set ∇f = λ∇g + μ∇h, then solve the system together with both constraint
            equations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FileText className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          {[
            "HW5 p.1",
            "Quiz 5 p.1",
            "Quiz 5 p.3",
          ].map((source) => (
            <span
              key={source}
              className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
            >
              {source}
            </span>
          ))}
          <span className="text-xs text-muted-foreground">— click to open the page</span>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2.5">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-brand-foreground">
            <span className="font-semibold">What this professor tests:</span>{" "}
            constrained optimisation with Lagrange multipliers appeared in 2 of their
            past assessments.
          </p>
        </div>
      </div>
    </div>
  );
}
