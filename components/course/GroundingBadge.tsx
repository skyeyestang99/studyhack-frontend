import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import type { GroundingMode } from "@/types/api";

/**
 * Honest provenance badge: tells the student whether an answer came from their
 * course materials (grounded), was only loosely supported (partial), or is
 * general knowledge not found in their uploads (general).
 *
 * The badge is the product's core distinction, so the label alone is not enough —
 * a first-time student has no reason to know that "general" is a warning rather
 * than a neutral descriptor. Each mode carries an explanation of what it means AND
 * what to do about it, exposed as both `title` (hover) and `aria-label` (screen
 * readers), since a tooltip that only works on hover excludes touch and keyboard
 * users. A one-time coach mark would be better still and is worth doing once
 * there's evidence students miss this.
 */
const EXPLANATION: Record<GroundingMode, string> = {
  grounded:
    "This answer came from material you uploaded for this course. Open the citations to check it against the source.",
  partial:
    "Your materials were only loosely related to this question, so parts of this answer are general knowledge. Check the citations before relying on it.",
  general:
    "Nothing in your uploads matched this question, so this is general knowledge and not specific to your class. Upload lecture notes or past assessments to get cited answers.",
};

export function GroundingBadge({
  mode,
  topSource,
}: {
  mode: GroundingMode;
  topSource?: string;
}) {
  const config = {
    grounded: {
      cls: "border-grounded/40 bg-grounded/10 text-grounded-foreground",
      Icon: CheckCircle2,
      label: topSource
        ? `From your course materials — ${topSource}`
        : "From your course materials",
    },
    partial: {
      cls: "border-brand/40 bg-brand/10 text-brand-foreground",
      Icon: CircleAlert,
      label: topSource
        ? `Loosely related to your materials — ${topSource}`
        : "Loosely related to your materials",
    },
    general: {
      cls: "border-border bg-muted text-muted-foreground",
      Icon: Info,
      label: "General answer — not found in your uploaded materials",
    },
  }[mode];

  return (
    <span
      className={`inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.cls}`}
      title={EXPLANATION[mode]}
      aria-label={`${config.label}. ${EXPLANATION[mode]}`}
    >
      <config.Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
