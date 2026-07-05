"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { MessageCircleQuestion, Plus, Send, Sparkles, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { env } from "@/lib/env";
import { getMockResponse } from "@/lib/mock-data";
import type { ChatMessage, Citation, Conversation, Course } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteDialog } from "@/components/dashboard/DeleteDialog";
import { getAuthToken } from "@/lib/auth-token";

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
  const abortRef = useRef<AbortController | null>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const streamSSE = useCallback(
    async (path: string, method: string, body?: unknown) => {
      setStreamingText("");
      const controller = new AbortController();
      abortRef.current = controller;
      let accumulated = "";
      let finalized = false;
      const citations: Citation[] = [];

      // Commit whatever has streamed so far as the assistant message (once).
      const finalize = () => {
        if (finalized) return;
        finalized = true;
        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: accumulated,
              createdAt: new Date().toISOString(),
              citations: citations.length ? [...citations] : undefined,
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
              } else if (currentEventType === "citation") {
                try {
                  const c = JSON.parse(data) as Citation;
                  if (c?.fileName) citations.push(c);
                } catch {
                  // ignore malformed citation frames
                }
              } else if (currentEventType === "done") {
                finalize();
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
    const content = questionText.trim();
    if (!content || isStreaming) return;

    setIsStreaming(true);
    setError(null);

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
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
      setQuestionText("");
      await streamSSE(`/api/conversations/${conv.id}/stream`, "POST");
      loadConversations();
    } catch {
      setError("Failed to start conversation. Please try again.");
      setIsStreaming(false);
    }
  };

  const handleSendMessage = async () => {
    if (!activeConversation || !inputText.trim() || isStreaming) return;
    const content = inputText.trim();
    setInputText("");
    setIsStreaming(true);
    setError(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await streamSSE(
        `/api/conversations/${activeConversation.id}/messages`,
        "POST",
        { content },
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
    <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border bg-neutral-50 p-2">
            <Sparkles className="h-5 w-5 text-neutral-700" />
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
      <CardContent className="space-y-4 px-4 pb-5 md:px-6">
        <div
          className={
            compact
              ? "grid gap-4 xl:grid-cols-[1fr_18rem]"
              : "grid gap-4 lg:grid-cols-[18rem_1fr]"
          }
        >
          <div className={compact ? "order-2 lg:order-1" : ""}>
            <div className="overflow-hidden rounded-xl border bg-neutral-50/60">
              <div className="flex items-center justify-between border-b bg-white px-3 py-2">
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
                      className={`group flex items-center border-b bg-white/70 last:border-b-0 hover:bg-white ${
                        activeConversation?.id === conv.id ? "bg-white" : ""
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

          <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border bg-white">
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-neutral-50/70 to-white p-4">
              {!activeConversation ? (
                <div className="flex h-full flex-col items-center justify-center gap-5 text-center text-muted-foreground">
                  <div className="rounded-2xl border bg-white p-3 shadow-sm">
                    <MessageCircleQuestion className="h-7 w-7 text-neutral-800" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      Ask a question about {course.code}
                    </p>
                    <p className="mt-1 text-sm leading-6">
                      Upload materials first for the most course-specific answer.
                    </p>
                  </div>
                  <textarea
                    className="min-h-[128px] w-full max-w-2xl resize-none rounded-2xl border bg-white px-4 py-3 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="What do you need help with?"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming}
                    maxLength={MAX_QUESTION_LENGTH}
                  />
                  <div className="flex w-full max-w-xl items-center justify-between">
                    <span className="text-xs">
                      {questionText.length} / {MAX_QUESTION_LENGTH}
                    </span>
                    <Button
                      onClick={handleCreateConversation}
                      disabled={!questionText.trim() || isStreaming}
                    >
                      Start conversation
                    </Button>
                    {isStreaming && (
                      <Button
                        variant="outline"
                        onClick={handleStop}
                        aria-label="Stop generating"
                      >
                        <Square className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                    )}
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
                            ? "bg-neutral-950 text-white"
                            : "border bg-white"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <Markdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {msg.content}
                              </Markdown>
                            </div>
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
                                      <span className="truncate">{c.fileName}</span>
                                      <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                                        {Math.round(c.score * 100)}% match
                                      </span>
                                    </li>
                                  ))}
                                </ul>
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
                      <div className="max-w-[84%] rounded-2xl border bg-white px-4 py-3 shadow-sm">
                        {streamingText ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {streamingText}
                            </Markdown>
                          </div>
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

            {activeConversation && (
              <div className="border-t bg-white p-3">
                <div className="mx-auto flex max-w-3xl gap-2">
                  <textarea
                    className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border bg-neutral-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                      disabled={!inputText.trim()}
                      size="icon"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
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
