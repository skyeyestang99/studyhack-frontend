"use client";

import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

export interface StreamingDisplayProps {
  responseText: string;
  isStreaming: boolean;
  error: string | null;
  onRetry: () => void;
}

export function StreamingDisplay({
  responseText,
  isStreaming,
  error,
  onRetry,
}: StreamingDisplayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [responseText]);

  if (error) {
    return (
      <div
        aria-live="assertive"
        className="rounded-md border border-destructive/50 bg-destructive/10 p-4"
      >
        <p className="mb-3 text-destructive">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (isStreaming && responseText === "") {
    return (
      <div
        aria-live="polite"
        className="flex items-center gap-1 py-4 text-muted-foreground"
      >
        <span className="animate-pulse">Thinking</span>
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
          .
        </span>
      </div>
    );
  }

  if (!responseText) {
    return null;
  }

  return (
    <div aria-live="polite" className="overflow-y-auto rounded-md border p-4">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <Markdown remarkPlugins={[remarkGfm]}>{responseText}</Markdown>
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
