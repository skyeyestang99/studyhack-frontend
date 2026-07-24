"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import type { StudyMaterialResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { resolveMaterialUrl } from "@/lib/urls";
import { getAuthToken } from "@/lib/auth-token";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MaterialPreviewDialogProps {
  material: StudyMaterialResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isPdf(material: StudyMaterialResponse) {
  const contentType = material.contentType?.toLowerCase() ?? "";
  return contentType.includes("pdf") || material.fileName.toLowerCase().endsWith(".pdf");
}

export function MaterialPreviewDialog({
  material,
  open,
  onOpenChange,
}: MaterialPreviewDialogProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const rawPreviewUrl = material?.previewUrl ?? material?.downloadUrl ?? null;
  const previewUrl = rawPreviewUrl ? resolveMaterialUrl(rawPreviewUrl) : null;
  const canRenderPdf = Boolean(fileUrl && material && isPdf(material));
  const rawOpenUrl = material?.downloadUrl ?? material?.previewUrl ?? null;
  const openUrl = rawOpenUrl ? resolveMaterialUrl(rawOpenUrl) : null;

  useEffect(() => {
    if (!open || !material || !openUrl) {
      setFileUrl(null);
      setFileError(null);
      setFileLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const loadFile = async () => {
      setFileLoading(true);
      setFileError(null);
      try {
        const token = await getAuthToken();
        const res = await fetch(openUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          throw new Error(`File preview failed (${res.status})`);
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setFileUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setFileUrl(null);
          setFileError(err instanceof Error ? err.message : "File preview failed");
        }
      } finally {
        if (!cancelled) setFileLoading(false);
      }
    };

    void loadFile();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, material, openUrl]);

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="pr-8">{material.fileName}</DialogTitle>
          <DialogDescription>
            {material.courseName} · {material.materialType}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[520px] bg-neutral-50 lg:grid-cols-[1fr_18rem]">
          <div className="min-h-[520px] bg-white">
            {fileLoading ? (
              <div className="flex h-full min-h-[520px] items-center justify-center px-6 text-sm text-muted-foreground">
                Loading preview...
              </div>
            ) : fileError ? (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="max-w-md text-sm text-red-600">{fileError}</p>
              </div>
            ) : canRenderPdf ? (
              <iframe
                className="h-full min-h-[520px] w-full border-0"
                src={fileUrl ?? previewUrl ?? undefined}
                title={`Preview ${material.fileName}`}
              />
            ) : (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Preview is not available for this file type yet.
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    PDF files can be previewed in the workspace. Word and
                    PowerPoint preview will depend on backend conversion or
                    storage preview support.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="border-l bg-white p-5">
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <p className="mt-1 font-medium">{material.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Uploaded
                </p>
                <p className="mt-1 font-medium">
                  {new Date(material.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Content type
                </p>
                <p className="mt-1 break-words font-medium">
                  {material.contentType ?? "Unknown"}
                </p>
              </div>
              {fileUrl && (
                <Button asChild className="w-full">
                  <a href={fileUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open file
                  </a>
                </Button>
              )}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
