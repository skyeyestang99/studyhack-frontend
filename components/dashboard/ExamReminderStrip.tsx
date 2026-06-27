"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { Course } from "@/types/api";
import type { SyllabusEvent } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ExamReminderStripProps {
  courses: Course[];
}

function daysUntil(date: string) {
  return Math.ceil(
    (new Date(date).getTime() - new Date().getTime()) / 86_400_000,
  );
}

export function ExamReminderStrip({ courses }: ExamReminderStripProps) {
  const [events, setEvents] = useState<SyllabusEvent[]>([]);

  useEffect(() => {
    apiClient
      .get<SyllabusEvent[]>("/api/syllabus-events")
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const upcoming = useMemo(() => {
    const courseIds = new Set(courses.map((course) => course.id));
    return events
      .filter(
        (event) =>
          courseIds.has(event.courseId) &&
          (event.type === "MIDTERM" || event.type === "FINAL") &&
          daysUntil(event.dueAt) >= 0 &&
          daysUntil(event.dueAt) <= 14,
      )
      .sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      )[0];
  }, [courses, events]);

  if (!upcoming) return null;

  const course = courses.find((item) => item.id === upcoming.courseId);

  return (
    <Card className="rounded-lg border-primary/20 bg-primary/5 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">
              {upcoming.title} for {course?.code ?? "your course"} is in{" "}
              {daysUntil(upcoming.dueAt)} days
            </p>
            <p className="text-sm text-muted-foreground">
              Use your syllabus and uploaded materials to generate a focused
              study guide.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/courses/${upcoming.courseId}/study-guide`}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Study Guide
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
