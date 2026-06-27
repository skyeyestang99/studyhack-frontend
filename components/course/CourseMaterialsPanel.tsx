"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, Library } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { ApiError, Course, StudyMaterialResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteDialog } from "@/components/dashboard/DeleteDialog";
import {
  EntityModal,
  type FieldConfig,
} from "@/components/dashboard/EntityModal";
import { MaterialList } from "@/components/dashboard/MaterialList";
import { MaterialPreviewDialog } from "@/components/dashboard/MaterialPreviewDialog";
import { UploadDialog } from "@/components/dashboard/UploadDialog";

interface CourseMaterialsPanelProps {
  course: Course;
  compact?: boolean;
  materialType?: StudyMaterialResponse["materialType"];
}

const materialTypeFields: FieldConfig[] = [
  {
    name: "materialType",
    label: "Material Type",
    type: "select",
    required: true,
    options: [
      { value: "HOMEWORK", label: "Homework" },
      { value: "PPT", label: "Lecture Slides" },
      { value: "EXAM", label: "Exam" },
      { value: "NOTES", label: "Notes" },
    ],
  },
];

export function CourseMaterialsPanel({
  course,
  compact = false,
  materialType,
}: CourseMaterialsPanelProps) {
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [editTarget, setEditTarget] = useState<StudyMaterialResponse | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<StudyMaterialResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewTarget, setPreviewTarget] =
    useState<StudyMaterialResponse | null>(null);

  const fetchMaterials = useCallback(async () => {
    try {
      const data = await apiClient.get<StudyMaterialResponse[]>(
        "/api/materials",
        { params: { courseId: course.id } },
      );
      setMaterials(
        materialType
          ? data.filter((material) => material.materialType === materialType)
          : data,
      );
    } catch {
      // Keep course pages usable if material polling fails.
    } finally {
      setLoading(false);
    }
  }, [course.id, materialType]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    const hasProcessing = materials.some((m) => m.status === "VALIDATING");
    if (hasProcessing) {
      intervalRef.current = setInterval(fetchMaterials, 10_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [materials, fetchMaterials]);

  const handleEdit = async (formData: Record<string, string>) => {
    if (!editTarget) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(
        `/api/materials/${editTarget.id}?materialType=${formData.materialType}`,
      );
      toast.success("Material type updated");
      setEditTarget(null);
      fetchMaterials();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.message || "Failed to update material");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/materials/${deleteTarget.id}`);
      toast.success("Material deleted");
      setDeleteTarget(null);
      fetchMaterials();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.message || "Failed to delete material");
    } finally {
      setIsDeleting(false);
    }
  };

  const readyCount = materials.filter((m) => m.status === "READY").length;
  const processingCount = materials.filter(
    (m) => m.status === "VALIDATING",
  ).length;
  const visibleMaterials = compact ? materials.slice(0, 5) : materials;

  return (
    <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border bg-neutral-50 p-2">
            <Library className="h-5 w-5 text-neutral-700" />
          </div>
          <div>
            <CardTitle className="text-lg tracking-tight">
              Course Materials
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
            {readyCount} ready · {processingCount} processing
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shadow-sm">
          <FileUp className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-5 md:px-6">
        <MaterialList
          materials={visibleMaterials}
          loading={loading}
          onEdit={setEditTarget}
          onDelete={setDeleteTarget}
          onPreview={setPreviewTarget}
        />
      </CardContent>

      <UploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchMaterials}
        courseId={course.id}
        courseLabel={`${course.code} — ${course.name}`}
      />

      <EntityModal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        title="Edit Material Type"
        fields={materialTypeFields}
        initialValues={
          editTarget ? { materialType: editTarget.materialType } : undefined
        }
        isSubmitting={isSubmitting}
      />

      <DeleteDialog
        open={deleteTarget !== null}
        entityName="Material"
        itemName={deleteTarget?.fileName ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />

      <MaterialPreviewDialog
        material={previewTarget}
        open={previewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
      />
    </Card>
  );
}
