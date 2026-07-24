"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, FilePlus2, UploadCloud, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { Course, StudyMaterialResponse } from "@/types/api";
import { env } from "@/lib/env";
import { getAuthToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  courseId?: string;
  courseLabel?: string;
  defaultMaterialType?: StudyMaterialResponse["materialType"];
}

const materialTypes = [
  { value: "SYLLABUS", label: "Syllabus / Schedule" },
  { value: "HOMEWORK", label: "Homework" },
  { value: "PPT", label: "Lecture Slides" },
  { value: "EXAM", label: "Exam" },
  { value: "NOTES", label: "Notes" },
];

function uploadErrorMessage(message: string) {
  if (
    message.includes("s3.auto.amazonaws.com") ||
    message.includes("ENOTFOUND") ||
    message.includes("getaddrinfo")
  ) {
    return "Storage is not configured for local upload. I switched the backend to local file storage when R2 is missing; restart the backend and try again.";
  }
  return message;
}

type UploadStatus = "queued" | "uploading" | "ready" | "error";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
}

export function UploadDialog({
  open,
  onOpenChange,
  onSuccess,
  courseId: lockedCourseId,
  courseLabel,
  defaultMaterialType,
}: UploadDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [courseId, setCourseId] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !lockedCourseId) {
      apiClient
        .get<Course[]>("/api/courses")
        .then(setCourses)
        .catch(() => {});
    }
  }, [open, lockedCourseId]);

  useEffect(() => {
    if (open && lockedCourseId) {
      setCourseId(lockedCourseId);
    }
    if (open && defaultMaterialType) {
      setMaterialType(defaultMaterialType);
    }
  }, [open, lockedCourseId, defaultMaterialType]);

  const missingRequirements = [
    files.length === 0 ? "Choose at least one file." : null,
    !courseId ? "Select a course." : null,
    !materialType ? "Select a material type." : null,
    !consent ? "Confirm you have the right to share this material." : null,
  ].filter((item): item is string => Boolean(item));
  const canSubmit = missingRequirements.length === 0 && !uploading;
  const showValidation = validationAttempted && missingRequirements.length > 0;

  const resetForm = () => {
    setFiles([]);
    setCourseId(lockedCourseId ?? "");
    setMaterialType(defaultMaterialType ?? "");
    setConsent(false);
    setError(null);
    setSuccess(false);
    setValidationAttempted(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !uploading) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const updateFile = (id: string, patch: Partial<UploadItem>) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const nextFiles = Array.from(fileList).map((nextFile) => ({
      id: `${nextFile.name}-${nextFile.size}-${nextFile.lastModified}-${crypto.randomUUID?.() ?? Date.now()}`,
      file: nextFile,
      progress: 0,
      status: "queued" as UploadStatus,
    }));
    setFiles((prev) => [...prev, ...nextFiles]);
    setError(null);
    setSuccess(false);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadOne = async (item: UploadItem) => {
    updateFile(item.id, { status: "uploading", progress: 10, error: undefined });

    try {
      if (env.useMocks) {
        for (const value of [35, 70, 100]) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          updateFile(item.id, { progress: value });
        }
        updateFile(item.id, { status: "ready", progress: 100 });
        return true;
      }

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("courseId", courseId);
      formData.append("materialType", materialType);
      updateFile(item.id, { progress: 35 });

      const token = await getAuthToken();
      const res = await fetch(`${env.apiUrl}/api/materials/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      updateFile(item.id, { progress: 80 });

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ message: "Upload failed" }));
        throw new Error(body.message || "Upload failed");
      }

      updateFile(item.id, { status: "ready", progress: 100 });
      return true;
    } catch (e) {
      updateFile(item.id, {
        status: "error",
        progress: 0,
        error: uploadErrorMessage(e instanceof Error ? e.message : "Upload failed"),
      });
      return false;
    }
  };

  const handleSubmit = async () => {
    setValidationAttempted(true);
    if (missingRequirements.length > 0) return;
    setUploading(true);
    setError(null);
    setSuccess(false);

    let allSucceeded = true;
    for (const item of files) {
      if (item.status === "ready") continue;
      const uploaded = await uploadOne(item);
      allSucceeded = allSucceeded && uploaded;
    }

    setUploading(false);
    setSuccess(allSucceeded);
    if (!allSucceeded) {
      setError("Some files could not be uploaded. Fix the issue and retry the failed files.");
    }
    if (allSucceeded) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[88vh] max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <div className="px-6 pt-6">
            <DialogTitle>Upload Study Material</DialogTitle>
            <DialogDescription className="mt-2">
              Add one file or upload multiple PDF, Word, PowerPoint, text, or Markdown files to the selected course.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="upload-file">Select a file to upload</Label>
            <div
              className={cn(
                "rounded-xl border border-dashed p-5 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : showValidation && files.length === 0
                    ? "border-amber-500 bg-amber-50/80"
                    : "bg-muted/30",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFiles(e.dataTransfer.files);
              }}
            >
              <UploadCloud className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag and drop one or multiple study materials
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, DOCX, PPTX, TXT, MD · multiple files supported
              </p>
            </div>
            <Input
              id="upload-file"
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.docx,.pptx"
              onChange={(e) => handleFiles(e.target.files)}
              className="sr-only"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                {files.length > 0 ? "Add more file(s)" : "Choose file(s)"}
              </Button>
              {files.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {files.length} file{files.length === 1 ? "" : "s"} selected
                </span>
              )}
            </div>
            {files.length > 0 && (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                {files.map((item) => (
                  <div key={item.id} className="rounded-md bg-background px-3 py-2">
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.file.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "capitalize text-muted-foreground",
                            item.status === "ready" && "text-green-700",
                            item.status === "error" && "text-red-600",
                          )}
                        >
                          {item.status === "ready" ? "uploaded" : item.status}
                        </span>
                        {!uploading && item.status !== "ready" && (
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Remove ${item.file.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-all",
                          item.status === "error" ? "bg-red-500" : "bg-primary",
                        )}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    {item.error && (
                      <p className="mt-1 text-xs leading-5 text-red-600">{item.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {lockedCourseId ? (
            <div className="space-y-2">
              <Label>Course</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {courseLabel ?? "Current course"}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="upload-course">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger
                  id="upload-course"
                  className={cn(
                    showValidation &&
                      !courseId &&
                      "border-amber-500 ring-1 ring-amber-500",
                  )}
                >
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="upload-type">Material Type</Label>
            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger
                id="upload-type"
                className={cn(
                  showValidation &&
                    !materialType &&
                    "border-amber-500 ring-1 ring-amber-500",
                )}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {materialTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "flex items-start gap-2 rounded-md border bg-muted/20 p-3",
              showValidation &&
                !consent &&
                "border-amber-500 bg-amber-50/80",
            )}
          >
            <input
              id="upload-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <Label
              htmlFor="upload-consent"
              className="text-xs font-normal leading-5 text-muted-foreground"
            >
              I have the right to share this material and understand it will be
              added to this course&apos;s shared knowledge base and used to answer
              questions for classmates enrolled in the same course. See our{" "}
              <Link
                href="/terms"
                target="_blank"
                className="underline hover:text-foreground"
              >
                Terms &amp; Privacy
              </Link>
              .
            </Label>
          </div>

          {error && (
            <p
              className="text-sm text-red-600"
              aria-live="assertive"
              role="alert"
            >
              {error}
            </p>
          )}

          {showValidation && (
            <div
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              aria-live="assertive"
              role="alert"
            >
              <p className="font-medium">Complete these before uploading:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {missingRequirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </div>
          )}

          {(uploading || success) && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {success && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {success
                  ? "Uploads complete. Parsing will continue in the background."
                  : uploading
                    ? "Uploading queue..."
                    : "Ready to upload"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
          >
            {success ? "Done" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? "Uploading…" : `Upload ${files.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
