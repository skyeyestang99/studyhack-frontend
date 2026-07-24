"use client";

import { cn } from "@/lib/utils";

export type StudyGuideMode = "personal" | "course";

interface StudyGuideModeToggleProps {
  value: StudyGuideMode;
  onChange: (value: StudyGuideMode) => void;
}

const options: Array<{ value: StudyGuideMode; label: string; detail: string }> =
  [
    {
      value: "personal",
      label: "Only my files",
      detail: "Personal Mode · this semester's uploads",
    },
    {
      value: "course",
      label: "Class knowledge base",
      detail: "Course Mode · materials from this course",
    },
  ];

export function StudyGuideModeToggle({
  value,
  onChange,
}: StudyGuideModeToggleProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md border px-3 py-2 text-left transition-colors",
            value === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-muted",
          )}
        >
          <span className="block text-sm font-medium">{option.label}</span>
          <span
            className={cn(
              "block text-xs",
              value === option.value
                ? "text-primary-foreground/80"
                : "text-muted-foreground",
            )}
          >
            {option.detail}
          </span>
        </button>
      ))}
    </div>
  );
}
