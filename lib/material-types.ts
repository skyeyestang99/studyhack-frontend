/**
 * Material type taxonomy — single source of truth for the frontend.
 *
 * Mirrors studyhack-backend/src/lib/material-types.ts. Kept in one module here because
 * the type list was previously duplicated in UploadDialog and CourseMaterialsPanel, and
 * two copies of a picker is how one of them keeps offering "PPT" after a rename.
 *
 * Labels are what a student would call the thing, not the enum name. The helper lines
 * exist because the type drives real behaviour — an EXAM feeds Exam Insights and earns a
 * larger OCR budget — so choosing correctly matters more than it looks.
 */
export const MATERIAL_TYPES = [
  "LECTURE_NOTES",
  "SLIDES",
  "EXAM",
  "QUIZ",
  "HOMEWORK",
  "SOLUTIONS",
  "SYLLABUS",
  "OTHER",
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

export interface MaterialTypeOption {
  value: MaterialType;
  label: string;
  /** One line explaining what picking this actually does. */
  helper?: string;
}

/**
 * Ordered for the picker with assessments first — the order itself tells a student which
 * contribution is most valuable, which is the cheapest nudge available.
 */
export const MATERIAL_TYPE_OPTIONS: readonly MaterialTypeOption[] = [
  {
    value: "EXAM",
    label: "Past exam",
    helper: "Used to detect what your professor tests",
  },
  {
    value: "QUIZ",
    label: "Quiz",
    helper: "Also used for exam insights",
  },
  {
    value: "SOLUTIONS",
    label: "Solutions",
    helper: "Worked answers to an exam, quiz or problem set",
  },
  { value: "HOMEWORK", label: "Homework / problem set" },
  { value: "LECTURE_NOTES", label: "Lecture notes" },
  { value: "SLIDES", label: "Lecture slides" },
  { value: "SYLLABUS", label: "Syllabus / schedule" },
  { value: "OTHER", label: "Something else" },
];

const LABELS: Record<string, string> = Object.fromEntries(
  MATERIAL_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Display label for a stored type.
 *
 * Tolerates unknown and legacy values rather than rendering blank: rows written before
 * migration 0026 (PPT, NOTES) may still be in a cached client response, and a material
 * with no label looks like a broken row.
 */
export function materialTypeLabel(type: string | null | undefined): string {
  if (!type) return "Material";
  if (LABELS[type]) return LABELS[type];
  const legacy: Record<string, string> = {
    PPT: "Lecture slides",
    NOTES: "Lecture notes",
  };
  if (legacy[type]) return legacy[type];
  // Last resort: make the raw value readable instead of showing an enum.
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Types that feed Exam Insights — used for UI copy about corpus strength. */
export const ASSESSMENT_TYPES: readonly MaterialType[] = [
  "EXAM",
  "QUIZ",
  "HOMEWORK",
  "SOLUTIONS",
];

export function isAssessmentType(type: string | null | undefined): boolean {
  return !!type && (ASSESSMENT_TYPES as readonly string[]).includes(type);
}
