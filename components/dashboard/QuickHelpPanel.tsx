"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Send, Sparkles, Target } from "lucide-react";
import { env } from "@/lib/env";
import { getAuthToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLES = [
  "How do I find the critical points of f(x,y) = x² + y² − 4x + 6y?",
  "Explain Lagrange multipliers like I've never seen them",
  "Why does my proof by induction fail at the base case?",
];

/**
 * Quick Help — ask a homework question with zero setup.
 *
 * Deliberately the first thing on the dashboard. Every other tutoring path in the
 * product requires picking a school, finding a professor, creating a course and
 * uploading material before the student learns whether any of it is useful, while
 * the tool they are comparing it against answers instantly. This is the front
 * door: get them helped once, then show what the course-scoped version adds.
 *
 * The answer is honestly labelled as not coming from their class, and the upgrade
 * path is attached to that admission rather than hidden. Overstating an unsourced
 * answer would waste the one advantage the course-scoped product has.
 */
export function QuickHelpPanel({ hasCourses }: { hasCourses: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || streaming) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming(true);
    setError(null);
    setAnswer("");
    setAsked(true);

    try {
      const token = await getAuthToken();
      const res = await fetch(`${env.apiUrl}/api/quick-help`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: q }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trimStart();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw) as {
              type?: string;
              content?: string;
              message?: string;
            };
            if (event.type === "token" && event.content) {
              accumulated += event.content;
              setAnswer(accumulated);
            } else if (event.type === "error") {
              throw new Error(event.message ?? "Something went wrong");
            }
          } catch (err) {
            if (err instanceof Error && err.message !== "Something went wrong") continue;
            throw err;
          }
        }
      }
      if (!accumulated.trim()) {
        setError("No answer came back. Try rephrasing the question.");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message || "Could not get an answer");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <Card className="rounded-2xl border-amber-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
          <Sparkles className="h-4 w-4 text-amber-600" />
          Stuck on a problem? Ask now
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          No course setup needed. Type the question and get worked guidance.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void ask(question);
              }
            }}
            placeholder="Paste your homework problem…"
            rows={2}
            aria-label="Your homework question"
            className="min-h-[60px] flex-1 resize-none"
          />
          <Button
            onClick={() => void ask(question)}
            disabled={streaming || !question.trim()}
            className="sm:self-end"
          >
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2">{streaming ? "Thinking…" : "Ask"}</span>
          </Button>
        </div>

        {!asked && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuestion(ex);
                  void ask(ex);
                }}
                className="rounded-full border bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {ex.length > 52 ? `${ex.slice(0, 52)}…` : ex}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {answer && (
          <div className="space-y-3">
            <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 px-4 py-3 text-sm leading-relaxed">
              {answer}
              {streaming && <span className="ml-0.5 animate-pulse">▌</span>}
            </div>

            {/*
              Stated plainly rather than buried: this answer used general
              knowledge, not the student's class. That admission is what makes the
              upgrade concrete instead of a generic upsell.
            */}
            {!streaming && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                <p className="flex items-start gap-2 text-sm text-amber-900">
                  <Target className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    This answer came from general knowledge — not your class. Add your
                    course and uploads to get answers grounded in your own material, plus
                    what your professor actually tests.
                  </span>
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2.5">
                  <Link href={hasCourses ? "/dashboard/courses" : "/onboarding"}>
                    {hasCourses ? "Go to my courses" : "Set up my course"}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
