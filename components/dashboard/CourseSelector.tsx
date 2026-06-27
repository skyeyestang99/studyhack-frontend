"use client";

import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Course } from "@/types/api";

export interface CourseSelectorProps {
  courses: Course[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export function CourseSelector({
  courses,
  selectedId,
  onSelect,
  isLoading,
  disabled,
}: CourseSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="course-selector">Select a course</Label>
      <Select
        value={selectedId ?? undefined}
        onValueChange={onSelect}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id="course-selector">
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading courses…
            </span>
          ) : (
            <SelectValue placeholder="Select a course" />
          )}
        </SelectTrigger>
        <SelectContent>
          {courses.map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.code} — {course.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
