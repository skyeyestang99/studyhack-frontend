"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  FileText,
  Flag,
  FolderOpen,
  Hash,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { env } from "@/lib/env";
import { getAuthToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";
import { resolveMaterialUrl } from "@/lib/urls";
import type { SyllabusEvent } from "@/lib/mock-data";
import type {
  ApiError,
  Course,
  CreateStudyGuideResponse,
  StudyGuide,
  StudyGuideConcept,
  StudyGuideListItem,
  StudyGuideRetrievalMode,
  StudyGuideRevision,
  StudyGuideSource,
  StudyGuideVersion,
  StudyGuideVersionMeta,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "concepts" | "practice";

function idempotencyKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function errorMessage(error: unknown) {
  return (error as ApiError)?.message ?? "Something went wrong.";
}

async function openSource(materialId: string, page?: number | null) {
  const token = await getAuthToken();
  const res = await fetch(`${env.apiUrl}/api/materials/${materialId}/preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Could not open source");
  const data = (await res.json()) as { previewUrl?: string };
  if (!data.previewUrl) throw new Error("Missing preview URL");
  const previewUrl = resolveMaterialUrl(data.previewUrl);
  window.open(
    page && page > 0 ? `${previewUrl}#page=${page}` : previewUrl,
    "_blank",
    "noopener",
  );
}

function statusTone(status: StudyGuide["status"]) {
  if (status === "ready") {
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  }
  if (status === "failed") {
    return "text-red-600 bg-red-50 border-red-200";
  }
  return "text-amber-700 bg-amber-50 border-amber-200";
}

function conceptTone(index: number) {
  const tones = [
    "bg-amber-50 text-amber-700 border-amber-200",
    "bg-sky-50 text-sky-700 border-sky-200",
    "bg-emerald-50 text-emerald-700 border-emerald-200",
    "bg-violet-50 text-violet-700 border-violet-200",
  ];
  return tones[index % tones.length];
}

function sourceLabel(source: StudyGuideSource, index: number) {
  return `S${index + 1}${source.page ? ` · p.${source.page}` : ""}`;
}

function daysUntil(date: string) {
  return Math.ceil(
    (new Date(date).getTime() - new Date().getTime()) / 86_400_000,
  );
}

function formatEventTime(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function PersistedStudyGuidePanel({ course }: { course: Course }) {
  const [target, setTarget] = useState("Midterm 1");
  const [retrievalMode, setRetrievalMode] =
    useState<StudyGuideRetrievalMode>("personal");
  const [guides, setGuides] = useState<StudyGuideListItem[]>([]);
  const [syllabusEvents, setSyllabusEvents] = useState<SyllabusEvent[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [guide, setGuide] = useState<StudyGuide | null>(null);
  const [versions, setVersions] = useState<StudyGuideVersionMeta[]>([]);
  const [viewingVersion, setViewingVersion] = useState<StudyGuideVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("concepts");
  const [guidesCollapsed, setGuidesCollapsed] = useState(false);
  const [editingGuide, setEditingGuide] = useState(false);
  const [guideTitleDraft, setGuideTitleDraft] = useState("");
  const [guideSummaryDraft, setGuideSummaryDraft] = useState("");
  const [editConcept, setEditConcept] = useState<StudyGuideConcept | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editKeyPoints, setEditKeyPoints] = useState("");
  const [editRunning, setEditRunning] = useState(false);
  const [revisionConcept, setRevisionConcept] =
    useState<StudyGuideConcept | null>(null);
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [revisionRunning, setRevisionRunning] = useState(false);

  const currentVersion = viewingVersion ?? guide?.currentVersion ?? null;
  const isWorking = guide?.status === "queued" || guide?.status === "generating";
  const isViewingCurrentVersion =
    !!currentVersion && currentVersion.id === guide?.currentVersionId && !viewingVersion;

  const allSources = useMemo(() => {
    const sources = new Map<string, StudyGuideSource>();
    currentVersion?.concepts.forEach((concept) => {
      concept.sources.forEach((source) => {
        sources.set(`${source.materialId}:${source.page ?? ""}:${source.snippet}`, source);
      });
    });
    return Array.from(sources.values());
  }, [currentVersion]);

  const selectedLabel = useMemo(() => {
    const row = guides.find((item) => item.id === selectedGuideId);
    return row?.title || row?.target || "Select guide";
  }, [guides, selectedGuideId]);

  const countdownEvent = useMemo(() => {
    const examEvents = syllabusEvents
      .filter(
        (event) =>
          event.courseId === course.id &&
          (event.type === "MIDTERM" || event.type === "FINAL") &&
          daysUntil(event.dueAt) >= 0,
      )
      .sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      );
    const cleanTarget = target.trim().toLowerCase();
    return (
      examEvents.find((event) =>
        event.title.toLowerCase().includes(cleanTarget),
      ) ?? examEvents[0]
    );
  }, [course.id, syllabusEvents, target]);

  const loadGuides = async () => {
    const rows = await apiClient.get<StudyGuideListItem[]>(
      `/api/courses/${course.id}/study-guides`,
    );
    setGuides(rows);
    if (!selectedGuideId && rows[0]) setSelectedGuideId(rows[0].id);
    if (selectedGuideId && !rows.some((row) => row.id === selectedGuideId)) {
      setSelectedGuideId(rows[0]?.id ?? null);
    }
  };

  const loadGuide = async (guideId: string) => {
    const next = await apiClient.get<StudyGuide>(`/api/study-guides/${guideId}`);
    setGuide(next);
    setViewingVersion(null);
    setEditingGuide(false);
    setEditConcept(null);
  };

  const loadVersions = async (guideId: string) => {
    const rows = await apiClient.get<StudyGuideVersionMeta[]>(
      `/api/study-guides/${guideId}/versions`,
    );
    setVersions(rows);
  };

  const viewVersion = async (versionId: string) => {
    if (!guide) return;
    const version = await apiClient.get<StudyGuideVersion>(
      `/api/study-guides/${guide.id}/versions/${versionId}`,
    );
    setViewingVersion(version);
    setEditingGuide(false);
    setEditConcept(null);
    setRevisionConcept(null);
  };

  const refreshCurrentGuideStatus = async () => {
    if (!selectedGuideId) return;
    await Promise.all([
      loadGuides(),
      loadGuide(selectedGuideId),
      loadVersions(selectedGuideId),
    ]);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadGuides()
      .catch((error) => alive && toast.error(errorMessage(error)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  useEffect(() => {
    apiClient
      .get<SyllabusEvent[]>("/api/syllabus-events")
      .then((rows) => setSyllabusEvents(rows))
      .catch(() => setSyllabusEvents([]));
  }, []);

  useEffect(() => {
    if (!selectedGuideId) {
      setGuide(null);
      setVersions([]);
      setViewingVersion(null);
      return;
    }
    let alive = true;
    Promise.all([loadGuide(selectedGuideId), loadVersions(selectedGuideId)]).catch(
      (error) => alive && toast.error(errorMessage(error)),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuideId]);

  useEffect(() => {
    if (!selectedGuideId || !isWorking) return;
    const timer = window.setInterval(() => {
      refreshCurrentGuideStatus().catch(() => {});
    }, 2500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuideId, isWorking]);

  const createGuide = async () => {
    const cleanTarget = target.trim();
    if (!cleanTarget) {
      toast.error("Target is required");
      return;
    }
    setCreating(true);
    try {
      const created = await apiClient.post<CreateStudyGuideResponse>(
        `/api/courses/${course.id}/study-guides`,
        { target: cleanTarget, retrievalMode },
        { headers: { "Idempotency-Key": idempotencyKey("study-guide") } },
      );
      setSelectedGuideId(created.guideId);
      setActiveTab("concepts");
      await loadGuides();
      await loadGuide(created.guideId);
      await loadVersions(created.guideId);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const startGuideEdit = () => {
    if (!guide?.currentVersion) return;
    setEditingGuide(true);
    setGuideTitleDraft(guide.currentVersion.title);
    setGuideSummaryDraft(guide.currentVersion.summary);
    setEditConcept(null);
    setRevisionConcept(null);
  };

  const startConceptEdit = (concept: StudyGuideConcept) => {
    setEditConcept(concept);
    setEditTitle(concept.title);
    setEditCategory(concept.category ?? "");
    setEditSummary(concept.summary);
    setEditKeyPoints(concept.keyPoints.join("\n"));
    setEditingGuide(false);
    setRevisionConcept(null);
  };

  const saveManualEdit = async (operations: unknown[]) => {
    if (!guide?.currentVersionId) {
      toast.error("Current version is required before saving edits.");
      return;
    }
    setEditRunning(true);
    try {
      await apiClient.post<{ guideId: string; versionId: string; status: string }>(
        `/api/study-guides/${guide.id}/edits`,
        { operations },
        {
          headers: {
            "Idempotency-Key": idempotencyKey("study-guide-edit"),
            "If-Match": guide.currentVersionId,
          },
        },
      );
      setEditingGuide(false);
      setEditConcept(null);
      await loadGuide(guide.id);
      await loadGuides();
      await loadVersions(guide.id);
      toast.success("Saved as a new version.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setEditRunning(false);
    }
  };

  const saveGuideEdit = () =>
    saveManualEdit([
      {
        type: "updateGuide",
        title: guideTitleDraft,
        summary: guideSummaryDraft,
      },
    ]);

  const saveConceptEdit = () => {
    if (!editConcept) return;
    const keyPoints = editKeyPoints
      .split("\n")
      .map((point) => point.trim())
      .filter(Boolean);
    if (keyPoints.length === 0) {
      toast.error("Add at least one key point.");
      return;
    }
    return saveManualEdit([
      {
        type: "updateConcept",
        conceptId: editConcept.logicalConceptId,
        title: editTitle,
        category: editCategory.trim() || undefined,
        summary: editSummary,
        keyPoints,
      },
    ]);
  };

  const submitRevision = async () => {
    if (!guide?.currentVersionId || !revisionConcept || !revisionInstruction.trim()) {
      return;
    }
    setRevisionRunning(true);
    try {
      const created = await apiClient.post<{
        revisionId: string;
        guideId: string;
        baseVersionId: string;
        status: StudyGuideRevision["status"];
      }>(
        `/api/study-guides/${guide.id}/revisions`,
        {
          baseVersionId: guide.currentVersionId,
          instruction: revisionInstruction.trim(),
          conceptIds: [revisionConcept.logicalConceptId],
        },
        { headers: { "Idempotency-Key": idempotencyKey("study-guide-revision") } },
      );
      for (let attempt = 0; attempt < 90; attempt += 1) {
        const revision = await apiClient.get<StudyGuideRevision>(
          `/api/study-guides/${guide.id}/revisions/${created.revisionId}`,
        );
        if (revision.status === "completed") break;
        if (revision.status === "failed") {
          throw new Error(revision.errorCode ?? "Revision failed");
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      setRevisionConcept(null);
      setRevisionInstruction("");
      await loadGuide(guide.id);
      await loadGuides();
      await loadVersions(guide.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRevisionRunning(false);
    }
  };

  return (
    <section className="min-h-[760px] overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-sm">
      <div
        className={cn(
          "overflow-x-auto",
          guidesCollapsed ? "[--guides-col:56px]" : "[--guides-col:200px]",
        )}
      >
        <div
          className="grid min-h-[760px] grid-cols-1 lg:min-w-[calc(var(--guides-col)_+_1040px)] lg:grid-cols-[var(--guides-col)_720px_320px]"
        >
          <aside className="hidden min-w-[var(--guides-col)] border-r border-border bg-secondary lg:block">
            <div
              className={cn(
                "flex h-11 items-center border-b border-border",
                guidesCollapsed ? "justify-center" : "justify-between px-4",
              )}
            >
              {!guidesCollapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Guides
                </p>
              )}
              <button
                type="button"
                onClick={() => setGuidesCollapsed((value) => !value)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
                title={guidesCollapsed ? "Expand guides" : "Collapse guides"}
                aria-label={guidesCollapsed ? "Expand guides" : "Collapse guides"}
              >
                {guidesCollapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className={cn("space-y-1", guidesCollapsed ? "p-1.5" : "p-2")}>
              {guides.length === 0 && !loading && (
                <div
                  className={cn(
                    "rounded-md border border-dashed border-neutral-300 text-xs text-neutral-500",
                    guidesCollapsed
                      ? "flex h-10 items-center justify-center"
                      : "px-3 py-4",
                  )}
                  title="No saved guides yet."
                >
                  {guidesCollapsed ? <BookOpen className="h-4 w-4" /> : "No saved guides yet."}
                </div>
              )}
              {guides.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedGuideId(item.id)}
                  className={`w-full rounded-md text-left transition-colors ${
                    item.id === selectedGuideId
                      ? "bg-amber-100 text-amber-800"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  } ${guidesCollapsed ? "flex h-10 items-center justify-center px-0 py-0" : "px-3 py-2"}`}
                  title={`${item.title || item.target} — ${item.status} · ${item.retrievalMode}`}
                >
                  <div className={cn("flex items-center gap-2", guidesCollapsed && "justify-center")}>
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    {!guidesCollapsed && (
                      <span className="truncate text-xs font-medium">
                        {item.title || item.target}
                      </span>
                    )}
                  </div>
                  {!guidesCollapsed && (
                    <p className="mt-1 truncate pl-5 font-mono text-[10px] opacity-70">
                      {item.status} · {item.retrievalMode}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-[720px] overflow-y-auto bg-background">
            <div className="border-b border-border bg-background px-4 py-5 md:px-8">
              <div className="mb-4 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate font-semibold text-foreground">{course.code}</span>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span className="truncate">{course.name}</span>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span className="truncate font-medium text-amber-700">
                  {currentVersion?.title ?? selectedLabel}
                </span>
                <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
                  {guide && (
                    <span
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium capitalize ${statusTone(
                        guide.status,
                      )}`}
                    >
                      {guide.status}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      refreshCurrentGuideStatus().catch((error) =>
                        toast.error(errorMessage(error)),
                      )
                    }
                    disabled={!selectedGuideId}
                    className="h-8 rounded-lg bg-card"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Refresh status
                  </Button>
                </div>
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.8fr)] xl:items-start">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold leading-tight tracking-tight">
                      Study Guide
                    </h1>
                    {currentVersion && !isViewingCurrentVersion && (
                      <span className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700">
                        Historical
                      </span>
                    )}
                  </div>
                  <div className="flex max-w-sm items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {countdownEvent
                          ? `${countdownEvent.title} is in ${daysUntil(
                              countdownEvent.dueAt,
                            )} days`
                          : `${target || "Exam"} countdown not set`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {countdownEvent
                          ? formatEventTime(countdownEvent.dueAt)
                          : "Add an exam date from the course home page."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                    <Input
                      value={target}
                      onChange={(event) => setTarget(event.target.value)}
                      placeholder="Target, e.g. Midterm 1"
                      disabled={creating}
                      className="h-11 bg-background text-base"
                    />
                    <Select
                      value={retrievalMode}
                      onValueChange={(value) =>
                        setRetrievalMode(value as StudyGuideRetrievalMode)
                      }
                    >
                      <SelectTrigger className="h-11 bg-background text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Only my files</SelectItem>
                        <SelectItem value="course">Class knowledge base</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={createGuide}
                    disabled={creating}
                    className="mt-3 h-11 w-full bg-amber-500 text-base text-white hover:bg-amber-600"
                  >
                    {creating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1">
                {(["concepts", "practice"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "bg-amber-500 text-white"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5 px-4 py-6 md:px-8">
              {loading && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading study guides...
                </div>
              )}

              {!loading && guides.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-4 text-sm font-semibold">No persisted guide yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a target and generate a saved, reopenable guide.
                  </p>
                </div>
              )}

              {guide && isWorking && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-amber-700" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      Generating from course materials
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      This guide is durable. You can leave the page and reopen it later.
                    </p>
                  </div>
                </div>
              )}

              {guide?.status === "failed" && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700">
                    {guide.errorMessage || guide.errorCode || "Guide generation failed."}
                  </p>
                </div>
              )}

              {currentVersion && activeTab === "concepts" && (
                <>
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <p className="text-xs leading-relaxed text-neutral-600">
                      Grounded in{" "}
                      <span className="font-medium text-foreground">
                        {guide?.retrievalMode === "personal"
                          ? "your uploaded files"
                          : "the class knowledge base"}
                      </span>
                      . Citations open through the authorized material preview endpoint.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {currentVersion.concepts.map((concept, index) => (
                      <ConceptCard
                        key={concept.logicalConceptId}
                        concept={concept}
                        index={index}
                        canRevise={isViewingCurrentVersion}
                        canEdit={isViewingCurrentVersion}
                        onEdit={() => startConceptEdit(concept)}
                        onRevise={() => {
                          setRevisionConcept(concept);
                          setRevisionInstruction("");
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {currentVersion && activeTab === "practice" && (
                <div className="space-y-3">
                  {currentVersion.concepts.map((concept, index) => (
                    <article
                      key={concept.logicalConceptId}
                      className="rounded-xl border border-border bg-card px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            Practice {index + 1}: {concept.title}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            Explain this concept from memory, then apply it to one example from your course materials.
                          </p>
                          {concept.keyPoints[0] && (
                            <p className="mt-3 rounded-lg border border-dashed border-border bg-secondary px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                              Check yourself against: {concept.keyPoints[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </main>

          <aside className="border-t border-border bg-secondary lg:border-l lg:border-t-0">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                  <Bot className="h-3.5 w-3.5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Guide Assistant</p>
                  <p className="text-[10px] text-muted-foreground">Scoped to this course</p>
                </div>
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-foreground">Guide state</p>
                <div className="mt-3 space-y-2 text-xs">
                  <MetaRow
                    icon={<Lock className="h-3.5 w-3.5" />}
                    label="Mode"
                    value={
                      guide?.retrievalMode === "course"
                        ? "Class knowledge base"
                        : "Only my files"
                    }
                  />
                  <MetaRow
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    label="Version"
                    value={
                      currentVersion
                        ? `v${currentVersion.versionNumber}${
                            isViewingCurrentVersion ? "" : " historical"
                          }`
                        : "Not ready"
                    }
                  />
                  <MetaRow
                    icon={<FolderOpen className="h-3.5 w-3.5" />}
                    label="Sources"
                    value={`${allSources.length}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full bg-background"
                  disabled={!isViewingCurrentVersion || !guide?.currentVersion}
                  onClick={startGuideEdit}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit overview
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-foreground">Version history</p>
                <div className="mt-3 space-y-2">
                  {versions.length === 0 && (
                    <p className="text-xs text-muted-foreground">No versions yet.</p>
                  )}
                  {versions.map((version) => {
                    const selected = currentVersion?.id === version.id;
                    const isCurrent = guide?.currentVersionId === version.id;
                    return (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => viewVersion(version.id).catch((error) => toast.error(errorMessage(error)))}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                          selected
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                        title={`Version ${version.versionNumber} · ${version.origin}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold">
                            v{version.versionNumber}
                            {isCurrent ? " current" : ""}
                          </span>
                          <span className="font-mono text-[10px] opacity-70">
                            {version.origin.replace("_", " ")}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-[10px] opacity-70">
                          {new Date(version.createdAt).toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {viewingVersion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full bg-background"
                    onClick={() => setViewingVersion(null)}
                  >
                    Return to current version
                  </Button>
                )}
              </div>

              {editingGuide && (
                <div className="rounded-xl border border-amber-200 bg-card p-4">
                  <p className="text-xs font-semibold">Edit guide overview</p>
                  <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                    Title
                  </label>
                  <Input
                    value={guideTitleDraft}
                    onChange={(event) => setGuideTitleDraft(event.target.value)}
                    disabled={editRunning}
                    className="mt-1 h-9 bg-background text-sm"
                  />
                  <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                    Summary
                  </label>
                  <textarea
                    value={guideSummaryDraft}
                    onChange={(event) => setGuideSummaryDraft(event.target.value)}
                    disabled={editRunning}
                    className="mt-1 min-h-24 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-background"
                      onClick={() => setEditingGuide(false)}
                      disabled={editRunning}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-amber-500 text-white hover:bg-amber-600"
                      onClick={saveGuideEdit}
                      disabled={editRunning}
                    >
                      {editRunning && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {editConcept && (
                <div className="rounded-xl border border-amber-200 bg-card p-4">
                  <p className="text-xs font-semibold">Edit concept</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {editConcept.title}
                  </p>
                  <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                    Title
                  </label>
                  <Input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    disabled={editRunning}
                    className="mt-1 h-9 bg-background text-sm"
                  />
                  <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                    Category
                  </label>
                  <Input
                    value={editCategory}
                    onChange={(event) => setEditCategory(event.target.value)}
                    disabled={editRunning}
                    className="mt-1 h-9 bg-background text-sm"
                  />
                  <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                    Summary
                  </label>
                  <textarea
                    value={editSummary}
                    onChange={(event) => setEditSummary(event.target.value)}
                    disabled={editRunning}
                    className="mt-1 min-h-24 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                    Key points
                  </label>
                  <textarea
                    value={editKeyPoints}
                    onChange={(event) => setEditKeyPoints(event.target.value)}
                    disabled={editRunning}
                    className="mt-1 min-h-28 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="One key point per line"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-background"
                      onClick={() => setEditConcept(null)}
                      disabled={editRunning}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-amber-500 text-white hover:bg-amber-600"
                      onClick={saveConceptEdit}
                      disabled={editRunning}
                    >
                      {editRunning && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {revisionConcept && (
                <div className="rounded-xl border border-amber-200 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold">Revise selected concept</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {revisionConcept.title}
                      </p>
                    </div>
                    <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setRevisionConcept(null)}
                    >
                      Cancel
                    </button>
                  </div>
                  <textarea
                    value={revisionInstruction}
                    onChange={(event) => setRevisionInstruction(event.target.value)}
                    placeholder="Make this easier, add steps, clarify notation..."
                    disabled={revisionRunning}
                    className="mt-3 min-h-24 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <Button
                    onClick={submitRevision}
                    disabled={revisionRunning || !revisionInstruction.trim()}
                    className="mt-3 w-full bg-amber-500 text-white hover:bg-amber-600"
                    size="sm"
                  >
                    {revisionRunning ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-3.5 w-3.5" />
                    )}
                    Submit revision
                  </Button>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-foreground">Available sources</p>
                <div className="mt-3 space-y-2">
                  {allSources.length === 0 && (
                    <p className="text-xs text-muted-foreground">No citations on this version.</p>
                  )}
                  {allSources.slice(0, 8).map((source, index) => (
                    <button
                      key={`${source.materialId}-${source.page ?? ""}-${index}`}
                      onClick={() =>
                        openSource(source.materialId, source.page).catch(() =>
                          toast.error("Could not open that source"),
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left hover:bg-accent"
                      title={source.snippet}
                    >
                      <span className="block font-mono text-[10px] text-amber-700">
                        {sourceLabel(source, index)} · {Math.round(source.score * 100)}%
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-muted-foreground">
                        {source.snippet}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ConceptCard({
  concept,
  index,
  canEdit,
  canRevise,
  onEdit,
  onRevise,
}: {
  concept: StudyGuideConcept;
  index: number;
  canEdit: boolean;
  canRevise: boolean;
  onEdit: () => void;
  onRevise: () => void;
}) {
  return (
    <article className="overflow-visible rounded-xl border border-border bg-card transition-colors hover:border-muted-foreground/40">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {concept.title}
            </h3>
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium ${conceptTone(
                index,
              )}`}
            >
              {concept.category || "Concept"}
            </span>
            {concept.contentOrigin !== "generated" && (
              <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] text-violet-700">
                {concept.contentOrigin.replace("_", " ")}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{concept.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onEdit}
            disabled={!canEdit}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            title={canEdit ? "Edit this concept" : "Edits require the current version"}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            onClick={onRevise}
            disabled={!canRevise}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            title={canRevise ? "Revise this concept" : "Revisions require the current version"}
          >
            <Sparkles className="h-3 w-3" />
            Revise
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="space-y-2">
          {concept.keyPoints.map((point, pointIndex) => (
            <div key={pointIndex} className="flex gap-2">
              <div className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500/70" />
              <p className="text-xs leading-relaxed text-foreground">{point}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          {concept.sources.length === 0 ? (
            <span className="font-mono text-[11px] text-muted-foreground">No sources</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {concept.sources.map((source, sourceIndex) => (
                <button
                  key={`${source.materialId}-${sourceIndex}`}
                  onClick={() =>
                    openSource(source.materialId, source.page).catch(() =>
                      toast.error("Could not open that source"),
                    )
                  }
                  className="rounded border border-border bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  title={source.snippet}
                >
                  {sourceLabel(source, sourceIndex)}
                </button>
              ))}
            </div>
          )}
          <Flag className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
        </div>
      </div>
    </article>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
      <span className="ml-auto max-w-36 truncate font-medium text-foreground">{value}</span>
    </div>
  );
}
