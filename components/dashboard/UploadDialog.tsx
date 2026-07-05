"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, UploadCloud } from "lucide-react";
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
import { Course } from "@/types/api";
import { env } from "@/lib/env";
import { getAuthToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  courseId?: string;
  courseLabel?: string;
}

const materialTypes = [
  { value: "HOMEWORK", label: "Homework" },
  { value: "PPT", label: "Lecture Slides" },
  { value: "EXAM", label: "Exam" },
  { value: "NOTES", label: "Notes" },
];

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
}: UploadDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [courseId, setCourseId] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  }, [open, lockedCourseId]);

  const canSubmit = files.length > 0 && courseId && materialType && !uploading;

  const resetForm = () => {
    setFiles([]);
    setCourseId(lockedCourseId ?? "");
    setMaterialType("");
    setError(null);
    setSuccess(false);
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
        error: e instanceof Error ? e.message : "Upload failed",
      });
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!files.length || !courseId || !materialType) return;
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
    if (allSucceeded) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Study Material</DialogTitle>
          <DialogDescription>
            Add PDF, text, or Markdown files to the selected course.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="upload-file">Select a file to upload</Label>
            <div
              className={cn(
                "rounded-lg border border-dashed p-5 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "bg-muted/30",
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
                Drag and drop a PDF, text, or Markdown file
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, TXT, MD
              </p>
            </div>
            <Input
              id="upload-file"
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {files.length > 0 && (
              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                {files.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium">
                        {item.file.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 capitalize text-muted-foreground",
                          item.status === "ready" && "text-green-700",
                          item.status === "error" && "text-red-600",
                        )}
                      >
                        {item.status === "ready" ? "uploaded" : item.status}
                      </span>
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
                      <p className="text-xs text-red-600">{item.error}</p>
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
                <SelectTrigger id="upload-course">
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
              <SelectTrigger id="upload-type">
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

          {error && (
            <p
              className="text-sm text-red-600"
              aria-live="assertive"
              role="alert"
            >
              {error}
            </p>
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={uploading}
          >
            {success ? "Done" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {uploading ? "Uploading…" : `Upload ${files.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
