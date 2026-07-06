import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import type { GroundingMode } from "@/types/api";

/**
 * Honest provenance badge: tells the student whether an answer came from their
 * course materials (grounded), was only loosely supported (partial), or is
 * general knowledge not found in their uploads (general).
 */
export function GroundingBadge({
  mode,
  topSource,
}: {
  mode: GroundingMode;
  topSource?: string;
}) {
  const config = {
    grounded: {
      cls: "border-green-200 bg-green-50 text-green-800",
      Icon: CheckCircle2,
      label: topSource
        ? `From your course materials — ${topSource}`
        : "From your course materials",
    },
    partial: {
      cls: "border-amber-200 bg-amber-50 text-amber-800",
      Icon: CircleAlert,
      label: topSource
        ? `Loosely related to your materials — ${topSource}`
        : "Loosely related to your materials",
    },
    general: {
      cls: "border-neutral-200 bg-neutral-100 text-neutral-700",
      Icon: Info,
      label: "General answer — not found in your uploaded materials",
    },
  }[mode];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.cls}`}
    >
      <config.Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
