"use client";

import { useEffect, useState } from "react";
import { AlertCircle, FileText, Loader2, Target, Upload } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth-token";
import { env } from "@/lib/env";
import { resolveMaterialUrl } from "@/lib/urls";
import type { ApiError, Course, ExamInsights } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * "What this professor tests" — the product's differentiator, surfaced first.
 *
 * Everything here is derived from THIS course's past exams/quizzes/homework, so
 * every claim carries a citation the student can open. The empty state is
 * deliberately a call to action rather than a shrug: with no past assessments
 * there is genuinely nothing to say, and pretending otherwise would be the same
 * failure as a confident ungrounded study guide.
 */
export function ExamInsightsPanel({ course }: { course: Course }) {
  const [data, setData] = useState<ExamInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    apiClient
      .get<ExamInsights>(`/api/courses/${course.id}/exam-insights`)
      .then((next) => alive && setData(next))
      .catch((err: ApiError) => alive && setError(err?.message ?? "Could not load insights"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [course.id]);

  const openSource = async (materialId: string, page?: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${env.apiUrl}/api/materials/${materialId}/preview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { previewUrl?: string };
      if (!body.previewUrl) throw new Error();
      const url = resolveMaterialUrl(body.previewUrl);
      window.open(page && page > 1 ? `${url}#page=${page}` : url, "_blank", "noopener");
    } catch {
      // Non-fatal: the insight is still readable without opening the source.
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analysing {course.code}&apos;s past assessments…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex items-start gap-3 p-6 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const hasTopics = (data?.topics?.length ?? 0) > 0;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
            <Target className="h-4 w-4 text-amber-600" />
            What this professor tests
          </CardTitle>
          {hasTopics && (
            <span className="text-xs text-muted-foreground">
              from {data?.assessmentCount} past assessment
              {data?.assessmentCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {data?.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
        )}

        {!hasTopics ? (
          <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-5 text-sm">
            <p className="font-medium text-foreground">No past assessments yet</p>
            <p className="mt-1 text-muted-foreground">
              This is the one thing a general AI can&apos;t tell you. Upload a past exam, quiz, or
              problem set for {course.code} and we&apos;ll show you what this instructor actually
              emphasises — with citations.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href={`/courses/${course.id}/materials`}>
                <Upload className="mr-2 h-3.5 w-3.5" />
                Upload a past exam
              </Link>
            </Button>
          </div>
        ) : (
          <ol className="space-y-3">
            {data?.topics.map((topic, index) => (
              <li
                key={`${topic.topic}-${index}`}
                className="rounded-xl border bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {index + 1}. {topic.topic}
                  </span>
                  {topic.appearances > 1 && (
                    <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      in {topic.appearances} assessments
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {topic.howItsTested}
                </p>
                {topic.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    {topic.sources.map((source, i) => (
                      <button
                        key={`${source.materialId}-${i}`}
                        type="button"
                        onClick={() => openSource(source.materialId, source.page)}
                        className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                        title={`Open ${source.fileName}${source.page ? ` (page ${source.page})` : ""}`}
                      >
                        {source.fileName.replace(/\.pdf$/i, "")}
                        {source.page ? ` p.${source.page}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {hasTopics && (data?.assessmentCount ?? 0) < 3 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Based on only {data?.assessmentCount} assessment
            {data?.assessmentCount === 1 ? "" : "s"} — this shows emphasis, not a reliable trend.
            Adding more past exams sharpens it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
