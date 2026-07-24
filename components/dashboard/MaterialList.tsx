"use client";

import { StudyMaterialResponse } from "@/types/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Fragment, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface MaterialListProps {
  materials: StudyMaterialResponse[];
  loading: boolean;
  onEdit?: (material: StudyMaterialResponse) => void;
  onDelete?: (material: StudyMaterialResponse) => void;
  onPreview?: (material: StudyMaterialResponse) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  READY: { label: "Ready", className: "bg-green-100 text-green-800" },
  VALIDATING: {
    label: "Validating",
    className: "bg-yellow-100 text-yellow-800",
  },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800" },
  QUARANTINED: {
    label: "Quarantined",
    className: "bg-orange-100 text-orange-800",
  },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

// Never let an unrecognized backend status (e.g. a new lifecycle state) throw
// and blank the whole page.
const FALLBACK_STATUS = {
  label: "Unknown",
  className: "bg-neutral-100 text-neutral-700",
};

const typeLabels: Record<StudyMaterialResponse["materialType"], string> = {
  HOMEWORK: "Homework",
  PPT: "Lecture Slides",
  EXAM: "Exam",
  NOTES: "Notes",
};

export function MaterialList({
  materials,
  loading,
  onEdit,
  onDelete,
  onPreview,
}: MaterialListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No materials uploaded yet. Click &quot;Upload Material&quot; to get
        started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File Name</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {materials.map((m) => {
          const cfg = statusConfig[m.status] ?? FALLBACK_STATUS;
          const canPreview = m.status === "READY" && Boolean(onPreview);
          const hasDetail =
            (m.status === "REJECTED" && Boolean(m.rejectionReason)) ||
            m.status === "FAILED";
          const handleRowClick = () => {
            if (canPreview) {
              onPreview?.(m);
              return;
            }
            if (hasDetail) {
              setExpandedId(expandedId === m.id ? null : m.id);
            }
          };
          return (
            <Fragment key={m.id}>
              <TableRow
                className={cn(canPreview || hasDetail ? "cursor-pointer" : "")}
                tabIndex={canPreview ? 0 : undefined}
                onClick={handleRowClick}
                onKeyDown={(e) => {
                  if (!canPreview) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPreview?.(m);
                  }
                }}
              >
                <TableCell className="font-medium">{m.fileName}</TableCell>
                <TableCell>{m.courseName}</TableCell>
                <TableCell>{typeLabels[m.materialType]}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      cfg.className,
                    )}
                    aria-label={`Status: ${cfg.label}`}
                  >
                    {cfg.label}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(m.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onPreview && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={m.status !== "READY"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(m);
                        }}
                        aria-label={`Preview ${m.fileName}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(m);
                        }}
                        aria-label={`Edit ${m.fileName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(m);
                        }}
                        aria-label={`Delete ${m.fileName}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {expandedId === m.id && (m.status === "FAILED" || m.rejectionReason) && (
                <TableRow key={`${m.id}-reason`}>
                  <TableCell
                    colSpan={6}
                    className="bg-red-50 text-sm text-red-700"
                  >
                    {m.status === "FAILED"
                      ? "We couldn't process this file, so it isn't available to the tutor. Delete it and re-upload a clearer PDF or a supported format (PDF, DOCX, PPTX, TXT, MD)."
                      : `Rejection reason: ${m.rejectionReason}`}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
