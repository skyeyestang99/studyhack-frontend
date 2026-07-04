"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useEntities } from "@/hooks/useEntities";
import type { Course, Professor, School } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { CourseShell } from "@/components/course/CourseShell";
import { CourseHome } from "@/components/course/CourseHome";
import { CourseMaterialsPanel } from "@/components/course/CourseMaterialsPanel";
import { CourseChatPanel } from "@/components/course/CourseChatPanel";
import { SyllabusPanel } from "@/components/course/SyllabusPanel";

type CourseView =
  | "home"
  | "materials"
  | "chat"
  | "homework"
  | "exams"
  | "syllabus"
  | "study-guide"
  | "settings";

interface CoursePageClientProps {
  courseId: string;
  view: CourseView;
}

export function CoursePageClient({ courseId, view }: CoursePageClientProps) {
  const courses = useEntities<Course>("/api/courses");
  const schools = useEntities<School>("/api/schools");
  const professors = useEntities<Professor>("/api/professors");

  const isLoading =
    courses.isLoading || schools.isLoading || professors.isLoading;
  const error = courses.error || schools.error || professors.error;

  const refresh = () => {
    courses.refresh();
    schools.refresh();
    professors.refresh();
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <LoadingState />
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      </ProtectedRoute>
    );
  }

  const course = courses.data.find((item) => item.id === courseId);
  const school = course
    ? schools.data.find((item) => item.id === course.schoolId)
    : undefined;
  const professor = course
    ? professors.data.find((item) => item.id === course.professorId)
    : undefined;

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <EmptyState
            message="Course not found"
            actionLabel="Back to Dashboard"
            onAction={() => {
              window.location.href = "/dashboard";
            }}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <CourseShell course={course} school={school} professor={professor}>
        {view === "home" && (
          <CourseHome course={course} school={school} professor={professor} />
        )}
        {view === "materials" && <CourseMaterialsPanel course={course} />}
        {view === "chat" && <CourseChatPanel course={course} />}
        {view === "homework" && (
          <div className="space-y-6">
            <CourseMaterialsPanel course={course} materialType="HOMEWORK" />
            <CourseChatPanel course={course} compact />
          </div>
        )}
        {view === "exams" && (
          <div className="space-y-6">
            <SyllabusPanel course={course} />
            <CourseMaterialsPanel course={course} materialType="EXAM" />
          </div>
        )}
        {view === "study-guide" && (
          <div className="space-y-6">
            <SyllabusPanel course={course} />
            <CourseMaterialsPanel course={course} />
          </div>
        )}
        {view === "syllabus" && <SyllabusPanel course={course} />}
        {view === "settings" && (
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">School</p>
                  <p className="font-medium">{school?.name ?? "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Course</p>
                  <p className="font-medium">
                    {course.code} · {course.name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Professor</p>
                  <p className="font-medium">
                    {professor?.name ?? "Unknown"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Course metadata is managed from Course Setup in this phase.
              </p>
              <Button asChild variant="outline">
                <Link href="/dashboard/courses">Course Setup</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </CourseShell>
    </ProtectedRoute>
  );
}
