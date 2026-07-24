"use client";

import Link from "next/link";
import {
  BookMarked,
  FileText,
  MessageCircleQuestion,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { Course, Professor, School } from "@/types/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseChatPanel } from "@/components/course/CourseChatPanel";
import { CourseMaterialsPanel } from "@/components/course/CourseMaterialsPanel";
import { SyllabusPanel } from "@/components/course/SyllabusPanel";

interface CourseHomeProps {
  course: Course;
  school?: School;
  professor?: Professor;
}

export function CourseHome({ course, school, professor }: CourseHomeProps) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_20rem]">
          <div className="p-6 md:p-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-neutral-50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              AI study workspace
            </div>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
              Study with course-aware materials, exam reminders, and focused AI
              help.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Upload class files, watch upcoming exams, and ask StudyAI in the
              context of {course.code}. Keep this page open while working
              through homework or preparing for exams.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/courses/${course.id}/chat`}>
                  <MessageCircleQuestion className="mr-2 h-4 w-4" />
                  Ask StudyAI
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/courses/${course.id}/materials`}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload material
                </Link>
              </Button>
            </div>
          </div>
          <div className="border-t bg-neutral-50/80 p-6 lg:border-l lg:border-t-0 md:p-8">
            <div className="space-y-5 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  School
                </p>
                <p className="mt-1 font-medium text-neutral-950">
                  {school?.name ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Professor
                </p>
                <p className="mt-1 font-medium text-neutral-950">
                  {professor?.name ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Course
                </p>
                <p className="mt-1 font-medium text-neutral-950">
                  {course.code} · {course.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <SyllabusPanel course={course} compact />
          <CourseChatPanel course={course} compact />
          <CourseMaterialsPanel course={course} compact />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="rounded-2xl border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/courses/${course.id}/chat`}>
                  <MessageCircleQuestion className="mr-2 h-4 w-4" />
                  Open full chat
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/courses/${course.id}/materials`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Manage materials
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/courses/${course.id}/materials`}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload course files
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/courses/${course.id}/study-guide`}>
                  <BookMarked className="mr-2 h-4 w-4" />
                  Study guide
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-neutral-200 bg-white shadow-sm">
            <CardContent className="p-5 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-neutral-950">Course scope</p>
              <p className="mt-2">
                Uploads and chat are bound to this course. Shared course
                contribution remains disabled until backend enforcement exists.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
