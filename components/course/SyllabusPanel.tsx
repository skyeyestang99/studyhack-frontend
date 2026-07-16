"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { Course } from "@/types/api";
import type { SyllabusEvent } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("MIDTERM");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

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

  const addEvent = async () => {
    if (!title.trim() || !dueAt) return;
    setSaving(true);
    try {
      await apiClient.post("/api/syllabus-events", {
        courseId: course.id,
        title: title.trim(),
        type,
        dueAt: new Date(dueAt).toISOString(),
      });
      setTitle("");
      setDueAt("");
      setType("MIDTERM");
      setShowForm(false);
      loadEvents();
    } catch {
      toast.error("Couldn't add that event");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await apiClient.delete(`/api/syllabus-events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error("Couldn't delete that event");
    }
  };

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
          <Button variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? (
              <X className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {showForm ? "Cancel" : "Add date"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <StudyGuideModeToggle value={mode} onChange={setMode} />

        {showForm && (
          <div className="space-y-2 rounded-xl border bg-neutral-50 p-3">
            <Input
              placeholder="Title (e.g. Midterm 2, Homework 6)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-md border bg-white px-2 py-1 text-sm"
              >
                <option value="MIDTERM">Midterm</option>
                <option value="FINAL">Final</option>
                <option value="HOMEWORK">Homework</option>
                <option value="READING">Reading</option>
                <option value="OTHER">Other</option>
              </select>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={addEvent}
                disabled={!title.trim() || !dueAt || saving}
              >
                {saving ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
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
                <div className="flex items-center gap-2">
                  <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-xs text-muted-foreground">
                    {daysUntil(event.dueAt) >= 0
                      ? `${daysUntil(event.dueAt)}d`
                      : "Past"}
                  </span>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${event.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
