"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Flag,
  ImagePlus,
  MessageCircleQuestion,
  Plus,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  Check,
  Copy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { env } from "@/lib/env";
import { getMockResponse } from "@/lib/mock-data";
import type {
  ChatMessage,
  Citation,
  Conversation,
  Course,
  GroundingMode,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteDialog } from "@/components/dashboard/DeleteDialog";
import { GroundingBadge } from "@/components/course/GroundingBadge";
import { getAuthToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { AnswerMarkdown } from "@/components/shared/AnswerMarkdown";
import { resolveMaterialUrl } from "@/lib/urls";

interface CourseChatPanelProps {
  course: Course;
  compact?: boolean;
}

const MAX_QUESTION_LENGTH = 5000;


async function apiGet<T>(path: string): Promise<T> {
  if (env.useMocks) {
    const mockResponse = getMockResponse<T>(path);
    if (mockResponse !== undefined) return mockResponse;
  }
  const token = await getAuthToken();
  const res = await fetch(`${env.apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (env.useMocks && path === "/api/conversations") {
    const request = body as { courseId: string; questionText: string };
    return {
      id: `mock-conv-${Date.now()}`,
      courseId: request.courseId,
      courseName: "Mock Course",
      title: request.questionText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T;
  }
  const token = await getAuthToken();
  const res = await fetch(`${env.apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export function CourseChatPanel({ course, compact = false }: CourseChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [streamMode, setStreamMode] = useState<{
    mode: GroundingMode;
    topSource?: string;
  } | null>(null);
  const [streamVerified, setStreamVerified] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Tracks whether the user has scrolled up to re-read. Autoscroll already backs
  // off in that case, but without telling them new content arrived they can sit
  // reading while an answer finishes off-screen.
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [feedback, setFeedback] = useState<
    Record<string, { rating?: "up" | "down"; reported?: boolean }>
  >({});

  // Rate / report an assistant answer (quality-signal loop).
  const sendFeedback = async (
    messageId: string,
    patch: { rating?: "up" | "down"; reported?: boolean; reason?: string },
  ) => {
    if (!activeConversation || messageId.startsWith("assistant-")) return;
    setFeedback((f) => ({ ...f, [messageId]: { ...f[messageId], ...patch } }));
    try {
      const token = await getAuthToken();
      await fetch(
        `${env.apiUrl}/api/conversations/${activeConversation.id}/messages/${messageId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(patch),
        },
      );
      if (patch.reported) toast.success("Thanks — flagged for review");
    } catch {
      toast.error("Couldn't save feedback");
    }
  };

  const handleImageSelect = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      setAttachedImage(await compressImage(file));
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  // Open a cited source material (owner or enrolled) in a new tab, at the cited page.
  const openSource = async (materialId: string, page?: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${env.apiUrl}/api/materials/${materialId}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { previewUrl?: string };
      if (!data.previewUrl) throw new Error();
      const previewUrl = resolveMaterialUrl(data.previewUrl);
      const url = page && page > 1 ? `${previewUrl}#page=${page}` : previewUrl;
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Couldn't open that source");
    }
  };

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const data = await apiGet<Conversation[]>("/api/conversations");
      setConversations(data.filter((conv) => conv.courseId === course.id));
    } catch {
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, [course.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    // Keep the newest content in view by scrolling ONLY the chat container —
    // not the whole page. scrollIntoView() scrolls every scrollable ancestor
    // (incl. the window), so during streaming it dragged the entire page down
    // on each token. Setting the container's own scrollTop avoids that.
    // Skip if the user has scrolled up to re-read, so we don't yank them back.
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLatest(false);
    } else {
      // Content arrived while they were reading further up.
      setShowJumpToLatest(true);
    }
  }, [messages, streamingText]);

  const streamSSE = useCallback(
    async (path: string, method: string, body?: unknown) => {
      setStreamingText("");
      setStreamMode(null);
      setStreamVerified(false);
      const controller = new AbortController();
      abortRef.current = controller;
      let accumulated = "";
      let finalized = false;
      let msgMode: GroundingMode | undefined;
      let msgVerified = false;
      const citations: Citation[] = [];

      // Commit whatever has streamed so far as the assistant message (once).
      const finalize = (messageId?: string) => {
        if (finalized) return;
        finalized = true;
        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            {
              id: messageId ?? `assistant-${Date.now()}`,
              role: "assistant",
              content: accumulated,
              createdAt: new Date().toISOString(),
              citations: citations.length ? [...citations] : undefined,
              mode: msgMode,
              verified: msgVerified,
            },
          ]);
        }
        setStreamingText("");
      };

      try {
        if (env.useMocks) {
          const content =
            body && typeof body === "object" && "content" in body
              ? String((body as { content: string }).content)
              : "your question";
          const response = `From your **Exam: ${course.code} Midterm Review.pdf** (Source #1), here is a focused answer for "${content}".\n\n**Approach**\n\nIdentify the course concept, connect it to uploaded materials, and solve one step at a time.\n\n**Solution**\n\nUse the relevant definition, then apply it to the specific problem. For math, render inline formulas like $T(n)=2T(n/2)+n$ and display formulas with $$T(n)=O(n\\log n)$$.\n\n**Key Takeaways**\n\nReview the cited source and practice a similar problem before the exam.`;
          for (const char of response) {
            if (controller.signal.aborted) break;
            accumulated += char;
            setStreamingText(accumulated);
            await new Promise((resolve) => setTimeout(resolve, 3));
          }
          msgMode = "grounded";
          setStreamMode({
            mode: "grounded",
            topSource: `${course.code} Midterm Review.pdf`,
          });
          citations.push({
            materialId: "mock-material",
            fileName: `${course.code} Midterm Review.pdf`,
            score: 0.91,
            kind: "shared",
          });
          finalize();
          return;
        }

        const token = await getAuthToken();
        const res = await fetch(`${env.apiUrl}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          ...(body ? { body: JSON.stringify(body) } : {}),
        });

        if (!res.ok) throw new Error("Stream request failed");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEventType = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEventType = line.substring(6).trim();
              continue;
            }
            if (line.startsWith("data:")) {
              const rawData = line.substring(5);
              const data =
                rawData.length > 0 && rawData[0] === " "
                  ? rawData.substring(1)
                  : rawData;

              if (currentEventType === "token") {
                try {
                  accumulated += JSON.parse(data);
                } catch {
                  accumulated += data;
                }
                setStreamingText(accumulated);
              } else if (currentEventType === "mode") {
                try {
                  const m = JSON.parse(data) as {
                    mode: GroundingMode;
                    topSource?: string;
                  };
                  msgMode = m.mode;
                  setStreamMode(m);
                } catch {
                  // ignore malformed mode frame
                }
              } else if (currentEventType === "verification") {
                msgVerified = true;
                setStreamVerified(true);
              } else if (currentEventType === "citation") {
                try {
                  const c = JSON.parse(data) as Citation;
                  if (c?.fileName) citations.push(c);
                } catch {
                  // ignore malformed citation frames
                }
              } else if (currentEventType === "done") {
                try {
                  const d = JSON.parse(data) as { messageId?: string };
                  finalize(d?.messageId);
                } catch {
                  finalize();
                }
              } else if (currentEventType === "error") {
                try {
                  const parsed = JSON.parse(data);
                  setError(parsed.message || "An error occurred");
                } catch {
                  setError(data);
                }
              }
              currentEventType = "";
            }
          }
        }
      } catch (e) {
        // Stopping mid-stream is not an error — keep the partial answer.
        if ((e as Error).name === "AbortError") {
          finalize();
        } else {
          throw e;
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [course.code],
  );

  const handleStop = () => abortRef.current?.abort();

  const openConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    setError(null);
    setStreamingText("");
    try {
      const msgs = await apiGet<ChatMessage[]>(
        `/api/conversations/${conv.id}/messages`,
      );
      setMessages(msgs);
    } catch {
      setError("Failed to load messages");
    }
  };

  const handleCreateConversation = async () => {
    const content = questionText.trim() || (attachedImage ? "Please help with this problem." : "");
    if (!content || isStreaming) return;

    setIsStreaming(true);
    setError(null);
    const image = attachedImage;

    try {
      const conv = await apiPost<Conversation>("/api/conversations", {
        courseId: course.id,
        questionText: content,
      });
      setActiveConversation(conv);
      setMessages([
        {
          id: "temp-user",
          role: "user",
          content: image ? `📷 ${content}` : content,
          createdAt: new Date().toISOString(),
        },
      ]);
      setQuestionText("");
      setAttachedImage(null);
      await streamSSE(
        `/api/conversations/${conv.id}/stream`,
        "POST",
        image ? { imageDataUrl: image } : undefined,
      );
      loadConversations();
    } catch {
      setError("Failed to start conversation. Please try again.");
      setIsStreaming(false);
    }
  };

  const copyAnswer = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard blocked; the text is still selectable */
    }
  };

  /**
   * Re-ask the question that produced a given answer.
   *
   * Pairs with the thumbs-down that was already collected: marking an answer bad
   * with no way to get a better one is a dead end. Finds the user message
   * immediately preceding the answer and resends it, rather than resending the
   * last message in the conversation, so regenerating an older answer works.
   */
  const regenerateAnswer = async (assistantMessageId: string) => {
    if (!activeConversation || isStreaming) return;
    const idx = messages.findIndex((m) => m.id === assistantMessageId);
    if (idx < 0) return;
    const priorUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!priorUser) return;
    // Strip the camera marker added for display so the model gets the real text.
    const content = priorUser.content.replace(/^📷\s*/, "");
    setIsStreaming(true);
    setError(null);
    try {
      await streamSSE(
        `/api/conversations/${activeConversation.id}/messages`,
        "POST",
        { content },
      );
      loadConversations();
    } catch {
      setError("Couldn't regenerate that answer. Please try again.");
      setIsStreaming(false);
    }
  };

  const handleSendMessage = async () => {
    if (!activeConversation || isStreaming) return;
    const content = inputText.trim() || (attachedImage ? "Please help with this problem." : "");
    if (!content) return;
    setInputText("");
    setIsStreaming(true);
    setError(null);
    const image = attachedImage;
    setAttachedImage(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: "user",
        content: image ? `📷 ${content}` : content,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await streamSSE(
        `/api/conversations/${activeConversation.id}/messages`,
        "POST",
        image ? { content, imageDataUrl: image } : { content },
      );
      loadConversations();
    } catch {
      setError("Failed to send message. Please try again.");
      setIsStreaming(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      await fetch(`${env.apiUrl}/api/conversations/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Conversation deleted");
      if (activeConversation?.id === deleteTarget.id) {
        setActiveConversation(null);
        setMessages([]);
      }
      setDeleteTarget(null);
      loadConversations();
    } catch {
      toast.error("Failed to delete conversation");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeConversation) {
        handleSendMessage();
      } else {
        handleCreateConversation();
      }
    }
  };

  const recentConversations = compact
    ? conversations.slice(0, 4)
    : conversations;

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-border bg-card shadow-sm",
        // Full-bleed pane in the dedicated chat view; a rounded card when embedded
        // (e.g. the compact panel on the homework tab).
        compact ? "rounded-2xl" : "h-full rounded-none border-x-0 border-b-0 md:rounded-none",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border bg-muted/50 p-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
          <CardTitle className="text-lg tracking-tight">Ask StudyHack</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Questions are scoped to {course.code}.
          </p>
          </div>
        </div>
        {compact && (
          <Button asChild variant="outline">
            <Link href={`/courses/${course.id}/chat`}>Open Chat</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent
        className={cn(
          "px-4 pb-5 md:px-6",
          compact ? "space-y-4" : "flex min-h-0 flex-1 flex-col pb-0",
        )}
      >
        <div
          className={
            compact
              ? "grid gap-4 xl:grid-cols-[1fr_18rem]"
              : "grid min-h-0 flex-1 gap-4 lg:grid-cols-[18rem_1fr]"
          }
        >
          <div className={compact ? "order-2 min-w-0 lg:order-1" : "flex min-h-0 min-w-0 flex-col"}>
            <div className="overflow-hidden rounded-xl border bg-muted/40">
              <div className="flex items-center justify-between border-b bg-card px-3 py-2">
                <h3 className="text-sm font-semibold">Conversations</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setActiveConversation(null);
                    setMessages([]);
                    setError(null);
                  }}
                  aria-label="New conversation"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loadingConversations ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Loading...
                  </p>
                ) : recentConversations.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No conversations yet
                  </p>
                ) : (
                  recentConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center border-b bg-card/70 last:border-b-0 hover:bg-card ${
                        activeConversation?.id === conv.id ? "bg-card" : ""
                      }`}
                    >
                      <button
                        onClick={() => openConversation(conv)}
                        className="min-w-0 flex-1 px-3 py-2 text-left"
                      >
                        <p className="truncate text-sm font-medium">
                          {conv.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-1 h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteTarget(conv)}
                        aria-label={`Delete conversation: ${conv.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-col overflow-hidden bg-card",
              compact ? "min-h-[28rem] rounded-xl border" : "h-full min-h-0",
            )}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleImageSelect(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="relative flex min-h-0 flex-1 flex-col">
              {showJumpToLatest && (
                <button
                  type="button"
                  onClick={() => {
                    const el = scrollContainerRef.current;
                    if (el) el.scrollTop = el.scrollHeight;
                    setShowJumpToLatest(false);
                  }}
                  className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-md hover:bg-accent"
                >
                  ↓ Jump to latest
                </button>
              )}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/40 to-card p-4">
              {!activeConversation ? (
                <div className="flex h-full flex-col items-center justify-center gap-5 text-center text-muted-foreground">
                  <div className="rounded-2xl border bg-card p-3 shadow-sm">
                    <MessageCircleQuestion className="h-7 w-7 text-foreground" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      Ask a question about {course.code}
                    </p>
                    <p className="mt-1 text-sm leading-6">
                      Upload materials first for the most course-specific answer.
                    </p>
                  </div>
                  {/* A blank textarea is the worst empty state: the student has to
                      invent a question to discover what the tool does. Quick Help
                      already proved one-click starters work, so the pattern is
                      ported here and made course-aware. */}
                  <div className="flex max-w-2xl flex-wrap justify-center gap-1.5">
                    {[
                      "Explain the last thing I uploaded",
                      `Give me 5 practice problems for ${course.code}`,
                      "What should I focus on for the next exam?",
                    ].map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        disabled={isStreaming}
                        onClick={() => setQuestionText(starter)}
                        className="rounded-full border bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="min-h-[128px] w-full max-w-2xl resize-none rounded-2xl border bg-card px-4 py-3 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="What do you need help with?"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming}
                    maxLength={MAX_QUESTION_LENGTH}
                  />
                  {attachedImage && (
                    <div className="flex w-full max-w-xl items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachedImage}
                        alt="attachment preview"
                        className="h-14 w-14 rounded-md border object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAttachedImage(null)}
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex w-full max-w-xl items-center justify-between gap-2">
                    <span className="text-xs">
                      {questionText.length} / {MAX_QUESTION_LENGTH}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isStreaming}
                        aria-label="Attach image"
                      >
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                      {isStreaming ? (
                        <Button
                          variant="outline"
                          onClick={handleStop}
                          aria-label="Stop generating"
                        >
                          <Square className="mr-2 h-4 w-4" />
                          Stop
                        </Button>
                      ) : (
                        <Button
                          onClick={handleCreateConversation}
                          disabled={!questionText.trim() && !attachedImage}
                        >
                          Start conversation
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[84%] rounded-2xl px-4 py-3 shadow-sm ${
                          msg.role === "user"
                            ? "bg-primary text-white"
                            : "border bg-card"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div>
                            {(msg.mode || msg.verified) && (
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                {msg.mode && <GroundingBadge mode={msg.mode} />}
                                {msg.verified && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-grounded/40 bg-grounded/10 px-2 py-0.5 text-xs font-medium text-grounded-foreground">
                                    ✓ Steps checked
                                  </span>
                                )}
                              </div>
                            )}
                            <AnswerMarkdown>{msg.content}</AnswerMarkdown>
                            {msg.citations && msg.citations.length > 0 && (
                              <div className="mt-3 border-t pt-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Sources
                                </p>
                                <ul className="mt-1 space-y-1">
                                  {msg.citations.map((c, i) => (
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
                                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                        {Math.round(c.score * 100)}% match
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {msg.mode === "general" && (
                              <div className="mt-2 rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand-foreground">
                                This wasn&apos;t found in your course materials.{" "}
                                <Link
                                  href={`/courses/${course.id}/materials`}
                                  className="font-medium underline"
                                >
                                  Upload the relevant notes
                                </Link>{" "}
                                for a course-specific answer.
                              </div>
                            )}
                            {!msg.id.startsWith("assistant-") && (
                              <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                                <button
                                  onClick={() => sendFeedback(msg.id, { rating: "up" })}
                                  className={`rounded p-1 hover:bg-muted ${feedback[msg.id]?.rating === "up" ? "text-green-600" : ""}`}
                                  aria-label="Helpful"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => sendFeedback(msg.id, { rating: "down" })}
                                  className={`rounded p-1 hover:bg-muted ${feedback[msg.id]?.rating === "down" ? "text-red-600" : ""}`}
                                  aria-label="Not helpful"
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => sendFeedback(msg.id, { reported: true })}
                                  className={`rounded p-1 hover:bg-muted ${feedback[msg.id]?.reported ? "text-brand" : ""}`}
                                  aria-label="Report this answer"
                                >
                                  <Flag className="h-3.5 w-3.5" />
                                </button>
                                {/* Students copy worked solutions; hand-selecting
                                    rendered KaTeX produces garbage. */}
                                <button
                                  onClick={() => void copyAnswer(msg.id, msg.content)}
                                  className="rounded p-1 hover:bg-muted"
                                  aria-label="Copy answer"
                                  title="Copy answer"
                                >
                                  {copiedId === msg.id ? (
                                    <Check className="h-3.5 w-3.5 text-grounded" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                {/* Marking an answer unhelpful with no way to get a
                                    better one is a dead end. */}
                                <button
                                  onClick={() => void regenerateAnswer(msg.id)}
                                  disabled={isStreaming}
                                  className="rounded p-1 hover:bg-muted disabled:opacity-40"
                                  aria-label="Regenerate this answer"
                                  title="Try again"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm">
                            {msg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="max-w-[84%] rounded-2xl border bg-card px-4 py-3 shadow-sm">
                        {(streamMode || streamVerified) && (
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {streamMode && (
                              <GroundingBadge
                                mode={streamMode.mode}
                                topSource={streamMode.topSource}
                              />
                            )}
                            {streamVerified && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-grounded/40 bg-grounded/10 px-2 py-0.5 text-xs font-medium text-grounded-foreground">
                                ✓ Steps checked
                              </span>
                            )}
                          </div>
                        )}
                        {streamingText ? (
                          <AnswerMarkdown>{streamingText}</AnswerMarkdown>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Thinking...
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            </div>

            {activeConversation && (
              <div className="border-t bg-card p-3">
                <div className="mx-auto max-w-3xl space-y-2">
                  {attachedImage && (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachedImage}
                        alt="attachment preview"
                        className="h-14 w-14 rounded-md border object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAttachedImage(null)}
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => imageInputRef.current?.click()}
                      size="icon"
                      variant="outline"
                      disabled={isStreaming}
                      aria-label="Attach image"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <textarea
                      className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Type your follow-up question..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isStreaming}
                      maxLength={MAX_QUESTION_LENGTH}
                      rows={1}
                    />
                    {isStreaming ? (
                      <Button
                        onClick={handleStop}
                        size="icon"
                        variant="outline"
                        aria-label="Stop generating"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() && !attachedImage}
                        size="icon"
                        aria-label="Send message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <DeleteDialog
        open={deleteTarget !== null}
        entityName="Conversation"
        itemName={deleteTarget?.title ?? ""}
        onConfirm={handleDeleteConversation}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </Card>
  );
}
