"use client";

import { useCallback, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { Course } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  dueAt: string;
  intervalDays: number;
  reps: number;
}

interface Stats {
  total: number;
  due: number;
  mastered: number;
}

const Md = ({ children }: { children: string }) => (
  <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
    {children}
  </Markdown>
);

export function FlashcardsPanel({ course }: { course: Course }) {
  const [stats, setStats] = useState<Stats>({ total: 0, due: 0, mastered: 0 });
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStats(await apiClient.get<Stats>(`/api/courses/${course.id}/flashcards/stats`));
    } catch {
      /* keep prior */
    }
  }, [course.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await apiClient.post<{ created: number }>(
        `/api/courses/${course.id}/flashcards/generate`,
        { topic: topic.trim() || undefined, count: 10 },
      );
      toast.success(`Added ${r.created} flashcards`);
      setTopic("");
      loadStats();
    } catch {
      toast.error("Couldn't generate flashcards");
    } finally {
      setGenerating(false);
    }
  };

  const startReview = async () => {
    try {
      const due = await apiClient.get<Flashcard[]>(
        `/api/courses/${course.id}/flashcards`,
        { params: { due: "1" } },
      );
      if (due.length === 0) {
        toast("Nothing due right now — generate some or come back later.");
        return;
      }
      setQueue(due);
      setIdx(0);
      setFlipped(false);
      setReviewing(true);
    } catch {
      toast.error("Couldn't load cards");
    }
  };

  const rate = async (grade: "again" | "good" | "easy") => {
    const card = queue[idx];
    if (!card) return;
    try {
      await apiClient.post(`/api/flashcards/${card.id}/review`, { grade });
    } catch {
      /* best-effort */
    }
    if (idx + 1 >= queue.length) {
      setReviewing(false);
      toast.success("Review complete!");
      loadStats();
    } else {
      setIdx(idx + 1);
      setFlipped(false);
    }
  };

  const card = queue[idx];

  return (
    <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border bg-neutral-50 p-2">
            <Layers className="h-5 w-5 text-neutral-700" />
          </div>
          <div>
            <CardTitle className="text-lg tracking-tight">Flashcards</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.total} cards · {stats.due} due · {stats.mastered} mastered
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-5 md:px-6">
        {!reviewing ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Topic (optional) — e.g. “separable ODEs”"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={generating}
                className="flex-1"
              />
              <Button onClick={generate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Layers className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>
              <Button
                variant="outline"
                onClick={startReview}
                disabled={stats.due === 0}
              >
                Review {stats.due > 0 ? `(${stats.due})` : ""}
              </Button>
            </div>
            {stats.total === 0 && (
              <p className="text-sm text-muted-foreground">
                Generate flashcards from your course materials, then review them on a
                spaced-repetition schedule.
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Card {idx + 1} of {queue.length}
            </p>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="min-h-[8rem] w-full rounded-xl border bg-neutral-50/60 p-5 text-left"
            >
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {flipped ? "Answer" : "Prompt"} · tap to flip
              </p>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <Md>{flipped ? card?.back ?? "" : card?.front ?? ""}</Md>
              </div>
            </button>
            {flipped ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => rate("again")}>
                  Again
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => rate("good")}>
                  Good
                </Button>
                <Button className="flex-1" onClick={() => rate("easy")}>
                  Easy
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => setFlipped(true)}>
                Show answer
              </Button>
            )}
            <button
              onClick={() => {
                setReviewing(false);
                loadStats();
              }}
              className="text-xs text-muted-foreground hover:underline"
            >
              End review
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
