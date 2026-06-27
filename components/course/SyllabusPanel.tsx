"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { Course } from "@/types/api";
import type { SyllabusEvent } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StudyGuideMode,
  StudyGuideModeToggle,
} from "@/components/course/StudyGuideModeToggle";

interface SyllabusPanelProps {
  course: Course;
  compact?: boolean;
}

const examTypes = new Set(["MIDTERM", "FINAL"]);

function daysUntil(date: string) {
  const now = new Date();
  const due = new Date(date);
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function SyllabusPanel({ course, compact = false }: SyllabusPanelProps) {
  const [events, setEvents] = useState<SyllabusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<StudyGuideMode>("personal");

  const loadEvents = useCallback(async () => {
    try {
      const data = await apiClient.get<SyllabusEvent[]>(
        "/api/syllabus-events",
        { params: { courseId: course.id } },
      );
      setEvents(
        data
          .filter((event) => event.courseId === course.id)
          .sort(
            (a, b) =>
              new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
          ),
      );
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const upcomingExam = useMemo(
    () =>
      events.find(
        (event) => examTypes.has(event.type) && daysUntil(event.dueAt) >= 0,
      ),
    [events],
  );
  const visibleEvents = compact ? events.slice(0, 4) : events;

  return (
    <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
              <CalendarDays className="h-5 w-5 text-neutral-700" />
              Study Guide
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Track upcoming exams and generate focused review plans from your
              course materials.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <StudyGuideModeToggle value={mode} onChange={setMode} />

        {mode === "global" && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Global Mode is shown for the target shared-course workflow. It will
            use cross-semester knowledge once the backend shared pool is
            enforced.
          </p>
        )}

        {upcomingExam && daysUntil(upcomingExam.dueAt) <= 14 && (
          <div className="rounded-2xl border bg-neutral-950 p-4 text-white shadow-sm">
            <p className="text-sm font-medium">
              {upcomingExam.title} is in {daysUntil(upcomingExam.dueAt)} days
            </p>
            <p className="mt-1 text-sm text-white/70">
              {formatDate(upcomingExam.dueAt)}
            </p>
            <Button className="mt-3 bg-white text-neutral-950 hover:bg-white/90" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Study Guide
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading syllabus...</p>
        ) : visibleEvents.length === 0 ? (
          <div className="rounded-xl border bg-neutral-50 p-4 text-sm text-muted-foreground">
            <FileText className="mb-2 h-5 w-5" />
            Upload a syllabus to unlock homework, midterm, and final reminders.
          </div>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-white">
            {visibleEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 p-3 text-sm transition-colors hover:bg-neutral-50"
              >
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.type} · {formatDate(event.dueAt)}
                  </p>
                </div>
                <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-xs text-muted-foreground">
                  {daysUntil(event.dueAt) >= 0
                    ? `${daysUntil(event.dueAt)}d`
                    : "Past"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
