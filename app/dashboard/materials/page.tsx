"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { StudyMaterialResponse, ApiError } from "@/types/api";
import { MaterialList } from "@/components/dashboard/MaterialList";
import { MaterialPreviewDialog } from "@/components/dashboard/MaterialPreviewDialog";
import { UploadDialog } from "@/components/dashboard/UploadDialog";
import {
  EntityModal,
  type FieldConfig,
} from "@/components/dashboard/EntityModal";
import { DeleteDialog } from "@/components/dashboard/DeleteDialog";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";

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

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Edit state
  const [editTarget, setEditTarget] = useState<StudyMaterialResponse | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] =
    useState<StudyMaterialResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewTarget, setPreviewTarget] =
    useState<StudyMaterialResponse | null>(null);

  const fetchMaterials = useCallback(async () => {
    try {
      const data =
        await apiClient.get<StudyMaterialResponse[]>("/api/materials");
      setMaterials(data);
    } catch {
      // silently fail on poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Auto-refresh while any material is VALIDATING
  useEffect(() => {
    const hasValidating = materials.some((m) => m.status === "VALIDATING");
    if (hasValidating) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Study Materials</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <FileUp className="mr-2 h-4 w-4" />
          Upload Material
        </Button>
      </div>

      <MaterialList
        materials={materials}
        loading={loading}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
        onPreview={setPreviewTarget}
      />

      <UploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchMaterials}
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
    </div>
  );
}
