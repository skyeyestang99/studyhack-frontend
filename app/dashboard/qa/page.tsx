"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEntities } from "@/hooks/useEntities";
import { CourseSelector } from "@/components/dashboard/CourseSelector";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  MessageCircleQuestion,
  Plus,
  Send,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import type { Course, Conversation, ChatMessage } from "@/types/api";
import { DeleteDialog } from "@/components/dashboard/DeleteDialog";
import { getAuthToken } from "@/lib/auth-token";
import { toast } from "sonner";

const MAX_QUESTION_LENGTH = 5000;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiGet<T>(path: string): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
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

export default function QAPage() {
  const {
    data: courses,
    isLoading: coursesLoading,
    error: coursesError,
    refresh: refreshCourses,
  } = useEntities<Course>("/api/courses");

  // Conversation list state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Active conversation state
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // New conversation form state
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");

  // Chat input state
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Delete conversation state
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom when messages change — scroll ONLY the chat
  // container, not the window (scrollIntoView scrolls every scrollable
  // ancestor and dragged the whole page down on each streamed token).
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingText]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const data = await apiGet<Conversation[]>("/api/conversations");
      setConversations(data);
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoadingConversations(false);
    }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    setShowNewChat(false);
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

  const handleStartNewChat = () => {
    setShowNewChat(true);
    setActiveConversation(null);
    setMessages([]);
    setSelectedCourseId(null);
    setQuestionText("");
    setError(null);
    setStreamingText("");
  };

  const handleDeleteConversation = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token = await getAuthToken();
      await fetch(`${API_URL}/api/conversations/${deleteTarget.id}`, {
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

  const handleCreateConversation = async () => {
    if (!selectedCourseId || !questionText.trim()) return;

    setIsStreaming(true);
    setError(null);

    try {
      // Create conversation (saves first user message on backend)
      const conv = await apiPost<Conversation>("/api/conversations", {
        courseId: selectedCourseId,
        questionText: questionText.trim(),
      });

      setActiveConversation(conv);
      setShowNewChat(false);
      setMessages([
        {
          id: "temp-user",
          role: "user",
          content: questionText.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
      setQuestionText("");

      // Stream the AI response for the first message
      await streamSSE(`/api/conversations/${conv.id}/stream`, "POST");

      // Reload conversations list
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

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await streamSSE(
        `/api/conversations/${activeConversation.id}/messages`,
        "POST",
        { content },
      );
      // Reload conversations to update order/timestamps
      loadConversations();
    } catch {
      setError("Failed to send message. Please try again.");
      setIsStreaming(false);
    }
  };

  const streamSSE = useCallback(
    async (path: string, method: string, body?: unknown) => {
      setStreamingText("");

      const token = await getAuthToken();
      const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!res.ok) throw new Error("Stream request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEventType = "";
      let accumulated = "";

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
                const token = JSON.parse(data);
                accumulated += token;
                setStreamingText(accumulated);
              } catch {
                accumulated += data;
                setStreamingText(accumulated);
              }
            } else if (currentEventType === "done") {
              // Add the complete assistant message
              const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: accumulated,
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreamingText("");
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

      setIsStreaming(false);
    },
    [],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showNewChat) {
        handleCreateConversation();
      } else {
        handleSendMessage();
      }
    }
  };

  if (coursesError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Homework Q&amp;A</h1>
        <ErrorState message={coursesError} onRetry={refreshCourses} />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Conversation sidebar */}
      <div className="hidden w-72 shrink-0 flex-col border-r md:flex">
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartNewChat}
            aria-label="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <p className="p-3 text-sm text-muted-foreground">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center border-b transition-colors hover:bg-muted ${
                  activeConversation?.id === conv.id ? "bg-muted" : ""
                }`}
              >
                <button
                  onClick={() => openConversation(conv)}
                  className="flex-1 px-3 py-2 text-left"
                >
                  <p className="truncate text-sm font-medium">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv.courseName}
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

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile back button + new chat */}
        <div className="flex items-center gap-2 border-b p-2 md:hidden">
          {activeConversation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveConversation(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="flex-1 truncate text-sm font-semibold">
            {activeConversation?.title || "Homework Q&A"}
          </h2>
          <Button variant="ghost" size="sm" onClick={handleStartNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Content area */}
        {!activeConversation && !showNewChat ? (
          // Empty state
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <MessageCircleQuestion className="h-12 w-12" />
            <p>Select a conversation or start a new one</p>
            <Button onClick={handleStartNewChat}>
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </div>
        ) : showNewChat ? (
          // New conversation form
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <Card className="mx-auto max-w-2xl">
                <CardContent className="space-y-4 pt-6">
                  <h2 className="text-lg font-semibold">
                    Start a New Conversation
                  </h2>
                  <CourseSelector
                    courses={courses}
                    selectedId={selectedCourseId}
                    onSelect={(id) => setSelectedCourseId(id)}
                    isLoading={coursesLoading}
                    disabled={isStreaming}
                  />
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="What do you need help with?"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming}
                    maxLength={MAX_QUESTION_LENGTH}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {questionText.length} / {MAX_QUESTION_LENGTH}
                    </span>
                    <Button
                      onClick={handleCreateConversation}
                      disabled={
                        !selectedCourseId || !questionText.trim() || isStreaming
                      }
                    >
                      Start Conversation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Active conversation chat
          <>
            {/* Messages */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <Markdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {msg.content}
                          </Markdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming response */}
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2">
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
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="animate-pulse">Thinking</span>
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          >
                            .
                          </span>
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          >
                            .
                          </span>
                          <span
                            className="animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          >
                            .
                          </span>
                        </div>
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
            </div>

            {/* Input area */}
            <div className="border-t p-4">
              <div className="mx-auto flex max-w-3xl gap-2">
                <textarea
                  ref={textareaRef}
                  className="flex min-h-[44px] max-h-[120px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Type your follow-up question..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isStreaming}
                  size="icon"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <DeleteDialog
        open={deleteTarget !== null}
        entityName="Conversation"
        itemName={deleteTarget?.title ?? ""}
        onConfirm={handleDeleteConversation}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
