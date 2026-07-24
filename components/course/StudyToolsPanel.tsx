"use client";

import { useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { BookOpen, ListChecks, Loader2, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { env } from "@/lib/env";
import { getAuthToken } from "@/lib/auth-token";
import type { Citation, Course, GroundingMode } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GroundingBadge } from "@/components/course/GroundingBadge";

type Kind = "study_guide" | "practice_problems";

export function StudyToolsPanel({ course }: { course: Course }) {
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [mode, setMode] = useState<{ mode: GroundingMode; topSource?: string } | null>(
    null,
  );
  const [running, setRunning] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async (kind: Kind) => {
    if (running) return;
    setRunning(kind);
    setOutput("");
    setCitations([]);
    setMode(null);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    const cites: Citation[] = [];

    try {
      const token = await getAuthToken();
      const res = await fetch(`${env.apiUrl}/api/courses/${course.id}/study-tools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kind, topic: topic.trim() || undefined, count: 5 }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let evType = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            evType = line.substring(6).trim();
            continue;
          }
          if (line.startsWith("data:")) {
            const raw = line.substring(5);
            const data = raw.length > 0 && raw[0] === " " ? raw.substring(1) : raw;
            if (evType === "token") {
              try {
                acc += JSON.parse(data);
              } catch {
                acc += data;
              }
              setOutput(acc);
            } else if (evType === "mode") {
              try {
                setMode(JSON.parse(data));
              } catch {
                // ignore malformed mode frame
              }
            } else if (evType === "citation") {
              try {
                const c = JSON.parse(data) as Citation;
                if (c?.fileName) cites.push(c);
              } catch {
                // ignore malformed citation
              }
            } else if (evType === "error") {
              try {
                setError(JSON.parse(data).message || "An error occurred");
              } catch {
                setError(data);
              }
            }
            evType = "";
          }
        }
      }
      setCitations(cites);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("Couldn't generate that. Please try again.");
      }
    } finally {
      abortRef.current = null;
      setRunning(null);
    }
  };

  const stop = () => abortRef.current?.abort();

  const openSource = async (materialId: string, page?: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${env.apiUrl}/api/materials/${materialId}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { previewUrl?: string };
      if (!data.previewUrl) throw new Error();
      const url = page && page > 1 ? `${data.previewUrl}#page=${page}` : data.previewUrl;
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Couldn't open that source");
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="rounded-xl border bg-neutral-50 p-2">
          <Sparkles className="h-5 w-5 text-neutral-700" />
        </div>
        <div>
          <CardTitle className="text-lg tracking-tight">Study Tools</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated from your {course.code} materials.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-5 md:px-6">
        <Input
          placeholder="Topic or exam — e.g. “Midterm 2”, “separable ODEs” (optional)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={!!running}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => generate("study_guide")} disabled={!!running}>
            <BookOpen className="mr-2 h-4 w-4" />
            Generate Study Guide
          </Button>
          <Button
            variant="outline"
            onClick={() => generate("practice_problems")}
            disabled={!!running}
          >
            <ListChecks className="mr-2 h-4 w-4" />
            Practice Problems
          </Button>
          {running && (
            <Button variant="ghost" onClick={stop} aria-label="Stop generating">
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {running && !output && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating from your materials…
          </p>
        )}

        {output && (
          <div className="rounded-xl border bg-neutral-50/50 p-4">
            {mode && (
              <div className="mb-2">
                <GroundingBadge mode={mode.mode} topSource={mode.topSource} />
              </div>
            )}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <Markdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {output}
              </Markdown>
            </div>
            {citations.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <p className="text-xs font-semibold text-muted-foreground">Sources</p>
                <ul className="mt-1 space-y-1">
                  {citations.map((c, i) => (
                    <li
                      key={`${c.materialId}-${i}`}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <button
                        onClick={() => openSource(c.materialId, c.page)}
                        className="truncate text-left text-blue-700 hover:underline"
                        title="Open source material"
                      >
                        {c.fileName}
                        {c.page ? ` · p.${c.page}` : ""}
                      </button>
                      <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                        {Math.round(c.score * 100)}% match
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
