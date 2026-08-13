/**
 * Client-side handling of the two quota outcomes the backend deliberately keeps
 * distinct.
 *
 * The backend separates QUOTA_EXCEEDED (429) from QUOTA_UNAVAILABLE (503) so an
 * outage is not indistinguishable from a paywall. If the client collapses both into
 * one error toast, that design work is undone at the last step — the student is told
 * "you ran out" when in fact our database was unreachable, and they go looking for an
 * upgrade button to fix our problem.
 *
 * Both streaming surfaces previously did `if (!res.ok) throw new Error("Request
 * failed")`, discarding the structured body entirely.
 */

export type UsageKind =
  | "quick_help"
  | "course_chat"
  | "study_guide"
  | "exam_insights"
  | "upload"
  | "ocr_page"
  | "escalation";

export type Tier = "FREE" | "STUDENT" | "TERM" | "BETA";

export interface QuotaExceeded {
  kind: "exceeded";
  tier: Tier;
  limit: number;
  used: number;
  resetsAt: string;
}

export interface QuotaUnavailable {
  kind: "unavailable";
}

export type QuotaRefusal = QuotaExceeded | QuotaUnavailable;

export interface UsageSummary {
  tier: Tier;
  resetsAt: string;
  kinds: { kind: UsageKind; used: number; limit: number }[];
}

/**
 * Inspect a failed response for a quota refusal.
 *
 * Returns null for any other failure so ordinary errors keep their existing
 * handling — this should add a state, not swallow unrelated ones.
 */
export async function readQuotaRefusal(res: Response): Promise<QuotaRefusal | null> {
  if (res.status !== 429 && res.status !== 503) return null;
  try {
    const body = (await res.json()) as {
      code?: string;
      tier?: Tier;
      limit?: number;
      used?: number;
      resetsAt?: string;
    };
    if (body.code === "QUOTA_UNAVAILABLE") return { kind: "unavailable" };
    if (body.code === "QUOTA_EXCEEDED") {
      return {
        kind: "exceeded",
        tier: body.tier ?? "FREE",
        limit: body.limit ?? 0,
        used: body.used ?? 0,
        resetsAt: body.resetsAt ?? "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** "in about 3 hours" / "tomorrow morning" — a reset time a student can act on. */
export function describeReset(resetsAt: string): string {
  if (!resetsAt) return "tomorrow";
  const reset = new Date(resetsAt);
  if (Number.isNaN(reset.getTime())) return "tomorrow";
  const hours = Math.max(0, (reset.getTime() - Date.now()) / 3_600_000);
  if (hours < 1) return "in under an hour";
  if (hours < 2) return "in about an hour";
  if (hours < 12) return `in about ${Math.round(hours)} hours`;
  return reset.toLocaleDateString(undefined, { weekday: "long" }) === new Date().toLocaleDateString(undefined, { weekday: "long" })
    ? "tomorrow"
    : `on ${reset.toLocaleDateString(undefined, { weekday: "long" })}`;
}

/** Human label for a metered operation. */
export const KIND_LABEL: Record<UsageKind, string> = {
  quick_help: "Quick Help questions",
  course_chat: "Course chat messages",
  study_guide: "Study guides",
  exam_insights: "Exam insight views",
  upload: "Uploads",
  ocr_page: "Scanned pages processed",
  escalation: "Deeper-reasoning re-runs",
};

/**
 * Only surface a meter once it is actually informative.
 *
 * Showing "1 of 200" all day trains people to ignore it, and turns a generous limit
 * into a visible ceiling that makes the product feel meaner than it is.
 */
export const METER_VISIBLE_AT = 0.7;
