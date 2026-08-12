"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { env } from "@/lib/env";
import { getAuthToken } from "@/lib/auth-token";
import { compressImage } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AnswerMarkdown } from "@/components/shared/AnswerMarkdown";

const EXAMPLES = [
  "How do I find the critical points of f(x,y) = x² + y² − 4x + 6y?",
  "Explain Lagrange multipliers like I've never seen them",
  "Why does my proof by induction fail at the base case?",
];

const MAX_CHARS = 5000;

/**
 * Quick Help — ask a homework question with zero setup.
 *
 * Deliberately the first thing on the dashboard. Every other tutoring path
 * requires picking a school, finding a professor, creating a course and uploading
 * material before the student learns whether any of it is useful, while the tool
 * they are comparing us against answers instantly. This is the front door: get
 * them helped once, then show what the course-scoped version adds.
 *
 * The answer is honestly labelled as not coming from their class, and the upgrade
 * path hangs off that admission rather than hiding it. Overstating an unsourced
 * answer would waste the one advantage the course-scoped product has.
 */
export function QuickHelpPanel({ hasCourses }: { hasCourses: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const overLimit = question.length > MAX_CHARS;

  const attach = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImage(await compressImage(file));
    } catch {
      setError("Couldn't read that image. Try a different photo.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable; nothing useful to say */
    }
  };

  const ask = async (text: string) => {
    const q = text.trim();
    // An image alone is a valid question ("solve this"), so allow either.
    if ((!q && !image) || streaming || overLimit) return;
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
        body: JSON.stringify({
          message: q || "Please help me solve the problem in this image.",
          ...(image ? { imageDataUrl: image } : {}),
        }),
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
          let event: { type?: string; content?: string; message?: string };
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }
          if (event.type === "token" && event.content) {
            accumulated += event.content;
            setAnswer(accumulated);
          } else if (event.type === "error") {
            throw new Error(event.message ?? "Something went wrong");
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
    <Card className="rounded-2xl border-brand/30 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
          <Sparkles className="h-4 w-4 text-brand" />
          Stuck on a problem? Ask now
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          No course setup needed. Type it or snap a photo.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {image && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Attached homework photo"
              className="max-h-32 rounded-lg border"
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label="Remove attached image"
              className="absolute -right-2 -top-2 rounded-full border bg-background p-1 shadow-sm hover:bg-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

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
            aria-invalid={overLimit}
            className="min-h-[60px] flex-1 resize-none"
          />
          <div className="flex gap-2 sm:flex-col sm:justify-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void attach(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach a photo of your problem"
              title="Attach a photo"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => void ask(question)}
              disabled={streaming || overLimit || (!question.trim() && !image)}
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2">{streaming ? "Thinking…" : "Ask"}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">⌘↵ to send</span>
          {/* Only appears near the limit — a permanent counter is noise. */}
          {question.length > MAX_CHARS * 0.8 && (
            <span className={overLimit ? "font-medium text-destructive" : ""}>
              {question.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          )}
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
            <div className="relative rounded-xl border bg-muted/30 px-4 py-3">
              {/* Students copy worked solutions; selecting rendered KaTeX by hand
                  produces garbage, so give them an explicit copy action. */}
              {!streaming && (
                <button
                  type="button"
                  onClick={() => void copy()}
                  aria-label="Copy answer"
                  title="Copy answer"
                  className="absolute right-2 top-2 rounded-md border bg-background p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-grounded" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <AnswerMarkdown>{answer}</AnswerMarkdown>
              {streaming && <span className="ml-0.5 animate-pulse">▌</span>}
            </div>

            {/* Stated plainly rather than buried: this answer used general
                knowledge, not the student's class. That admission is what makes
                the upgrade concrete instead of a generic upsell. */}
            {!streaming && (
              <div className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-3">
                <p className="flex items-start gap-2 text-sm text-brand-foreground">
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
