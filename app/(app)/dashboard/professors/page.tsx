"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useEntities } from "@/hooks/useEntities";
import { useEntityModal } from "@/hooks/useEntityModal";
import { EntityTable, type Column } from "@/components/dashboard/EntityTable";
import {
  EntityModal,
  type FieldConfig,
} from "@/components/dashboard/EntityModal";
import { DeleteDialog } from "@/components/dashboard/DeleteDialog";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import type { Professor, School, ApiError } from "@/types/api";

export default function ProfessorsPage() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

  const professorsParams = useMemo(
    () => (selectedSchoolId ? { schoolId: selectedSchoolId } : undefined),
    [selectedSchoolId],
  );

  const {
    data: professors,
    isLoading,
    error,
    refresh,
  } = useEntities<Professor>("/api/professors", professorsParams);

  const { data: schools } = useEntities<School>("/api/schools");

  const modal = useEntityModal<Professor>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Professor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const schoolMap = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [schools]);

  const columns: Column<Professor>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "department", header: "Department" },
      {
        key: "schoolId",
        header: "School",
        render: (value) => schoolMap.get(value as string) ?? "Unknown",
      },
      {
        key: "createdAt",
        header: "Created At",
        render: (value) => new Date(value as string).toLocaleDateString(),
      },
    ],
    [schoolMap],
  );

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ value: s.id, label: s.name })),
    [schools],
  );

  const fields: FieldConfig[] = useMemo(
    () => [
      {
        name: "name",
        label: "Name",
        type: "text" as const,
        required: true,
        placeholder: "Professor name",
      },
      {
        name: "department",
        label: "Department",
        type: "text" as const,
        required: false,
        placeholder: "Department (optional)",
      },
      {
        name: "schoolId",
        label: "School",
        type: "select" as const,
        required: true,
        placeholder: "Select a school",
        options: schoolOptions,
      },
    ],
    [schoolOptions],
  );

  const handleSubmit = async (formData: Record<string, string>) => {
    setIsSubmitting(true);
    try {
      if (modal.mode === "create") {
        await apiClient.post("/api/professors", {
          name: formData.name,
          department: formData.department || undefined,
          schoolId: formData.schoolId,
          confirmed: true,
        });
        toast.success("Professor created successfully");
      } else {
        await apiClient.put(`/api/professors/${modal.entity!.id}`, {
          name: formData.name,
          department: formData.department || undefined,
          schoolId: formData.schoolId,
        });
        toast.success("Professor updated successfully");
      }
      modal.close();
      refresh();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/professors/${deleteTarget.id}`);
      toast.success("Professor deleted successfully");
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.message || "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSchoolFilterChange = (value: string) => {
    setSelectedSchoolId(value === "all" ? "" : value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Professors</h1>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Professors</h1>
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Professors</h1>
        <Button onClick={modal.openCreate}>Create Professor</Button>
      </div>

      <Select
        value={selectedSchoolId || "all"}
        onValueChange={handleSchoolFilterChange}
      >
        <SelectTrigger className="max-w-sm">
          <SelectValue placeholder="Filter by school" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Schools</SelectItem>
          {schools.map((school) => (
            <SelectItem key={school.id} value={school.id}>
              {school.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {professors.length === 0 ? (
        <EmptyState
          message="No professors yet"
          actionLabel="Create Professor"
          onAction={modal.openCreate}
        />
      ) : (
        <EntityTable
          columns={columns}
          data={professors}
          onEdit={modal.openEdit}
          onDelete={setDeleteTarget}
        />
      )}

      <EntityModal
        open={modal.open}
        onClose={modal.close}
        onSubmit={handleSubmit}
        title={modal.mode === "create" ? "Create Professor" : "Edit Professor"}
        fields={fields}
        initialValues={
          modal.entity
            ? {
                name: modal.entity.name,
                department: modal.entity.department ?? "",
                schoolId: modal.entity.schoolId,
              }
            : undefined
        }
        isSubmitting={isSubmitting}
      />

      <DeleteDialog
        open={deleteTarget !== null}
        entityName="Professor"
        itemName={deleteTarget?.name ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
