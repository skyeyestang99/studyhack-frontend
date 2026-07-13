"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEntities } from "@/hooks/useEntities";
import { apiClient } from "@/lib/api-client";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { LeaveCourseDialog } from "@/components/dashboard/LeaveCourseDialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, MessageCircleQuestion } from "lucide-react";
import type { School, Professor, Course } from "@/types/api";
import { ExamReminderStrip } from "@/components/dashboard/ExamReminderStrip";

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [courseToLeave, setCourseToLeave] = useState<Course | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const schools = useEntities<School>("/api/schools");
  const professors = useEntities<Professor>("/api/professors");
  const courses = useEntities<Course>("/api/courses");

  const isLoading =
    schools.isLoading || professors.isLoading || courses.isLoading;
  const error = schools.error || professors.error || courses.error;

  const handleRetry = () => {
    schools.refresh();
    professors.refresh();
    courses.refresh();
  };

  const schoolMap = useMemo(() => {
    const map = new Map<string, School>();
    schools.data.forEach((school) => map.set(school.id, school));
    return map;
  }, [schools.data]);

  const professorMap = useMemo(() => {
    const map = new Map<string, Professor>();
    professors.data.forEach((professor) => map.set(professor.id, professor));
    return map;
  }, [professors.data]);

  const visibleCourses = useMemo(() => {
    if (selectedSchoolId === "all") return courses.data;
    return courses.data.filter((course) => course.schoolId === selectedSchoolId);
  }, [courses.data, selectedSchoolId]);

  const handleLeaveCourse = async () => {
    if (!courseToLeave) return;

    setIsLeaving(true);
    try {
      await apiClient.delete<void>("/api/enrollments", {
        params: { courseId: courseToLeave.id },
      });
      toast.success(`Left ${courseToLeave.code}`);
      setCourseToLeave(null);
      courses.refresh();
    } catch (err) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof err.message === "string"
          ? err.message
          : "Unable to leave the course";
      toast.error(message);
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <ErrorState message={error} onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.name ?? "User"}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a course workspace to upload materials or ask StudyAI.
          </p>
        </div>
        {courses.data.length > 0 && (
          <div className="w-full lg:w-72">
            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by school" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {schools.data.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {courses.data.length > 0 && (
        <ExamReminderStrip courses={visibleCourses} />
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">My Courses</h2>
            <p className="text-sm text-muted-foreground">
              Course workspaces combine upload, materials, and chat.
            </p>
          </div>
        </div>

        {courses.data.length === 0 ? (
          <Card className="rounded-lg shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <div className="rounded-full bg-primary/10 p-3">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Add your first course
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Set up a course to organize materials, ask questions, and
                  start studying with StudyAI.
                </p>
              </div>
              <Button asChild>
                <Link href="/onboarding">Add a course</Link>
              </Button>
            </CardContent>
          </Card>
        ) : visibleCourses.length === 0 ? (
          <Card className="rounded-lg shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {courses.data.length === 0
                    ? "You are not enrolled in any courses."
                    : "No courses match this school."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose another school or show all of your courses.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedSchoolId("all")}
              >
                Show all courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleCourses.map((course) => {
              const school = schoolMap.get(course.schoolId);
              const professor = professorMap.get(course.professorId);
              return (
                <Card
                  key={course.id}
                  className="rounded-lg shadow-sm transition-colors hover:bg-accent/50"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardDescription>{course.code}</CardDescription>
                        <CardTitle className="mt-1 text-xl">
                          {course.name}
                        </CardTitle>
                      </div>
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground">School</p>
                        <p className="font-medium">
                          {school?.name ?? "Unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Professor</p>
                        <p className="font-medium">
                          {professor?.name ?? "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center rounded-full border px-2 py-1">
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Materials
                      </span>
                      <span className="inline-flex items-center rounded-full border px-2 py-1">
                        <MessageCircleQuestion className="mr-1.5 h-3.5 w-3.5" />
                        Course chat
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild className="flex-1">
                        <Link href={`/courses/${course.id}`}>Open Course</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCourseToLeave(course)}
                      >
                        Leave course
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <LeaveCourseDialog
        open={courseToLeave !== null}
        courseName={courseToLeave?.name ?? ""}
        isLeaving={isLeaving}
        onConfirm={handleLeaveCourse}
        onCancel={() => {
          if (!isLeaving) setCourseToLeave(null);
        }}
      />
    </div>
  );
}
