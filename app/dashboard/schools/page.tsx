"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import type { School, ApiError } from "@/types/api";

const columns: Column<School>[] = [
  { key: "name", header: "Name" },
  { key: "location", header: "Location" },
  {
    key: "createdAt",
    header: "Created At",
    render: (value) => new Date(value as string).toLocaleDateString(),
  },
];

const fields: FieldConfig[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    required: true,
    placeholder: "School name",
  },
  {
    name: "location",
    label: "Location",
    type: "text",
    required: false,
    placeholder: "Location (optional)",
  },
];

export default function SchoolsPage() {
  const { data, isLoading, error, refresh } =
    useEntities<School>("/api/schools");
  const modal = useEntityModal<School>();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredSchools = data.filter((school) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSubmit = async (formData: Record<string, string>) => {
    setIsSubmitting(true);
    try {
      if (modal.mode === "create") {
        await apiClient.post("/api/schools", {
          name: formData.name,
          location: formData.location || undefined,
        });
        toast.success("School created successfully");
      } else {
        await apiClient.put(`/api/schools/${modal.entity!.id}`, {
          name: formData.name,
          location: formData.location || undefined,
        });
        toast.success("School updated successfully");
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
      await apiClient.delete(`/api/schools/${deleteTarget.id}`);
      toast.success("School deleted successfully");
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.message || "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Schools</h1>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Schools</h1>
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schools</h1>
        <Button onClick={modal.openCreate}>Create School</Button>
      </div>

      <Input
        placeholder="Search schools by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      {data.length === 0 ? (
        <EmptyState
          message="No schools yet"
          actionLabel="Create School"
          onAction={modal.openCreate}
        />
      ) : filteredSchools.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No schools match your search.
        </p>
      ) : (
        <EntityTable
          columns={columns}
          data={filteredSchools}
          onEdit={modal.openEdit}
          onDelete={setDeleteTarget}
        />
      )}

      <EntityModal
        open={modal.open}
        onClose={modal.close}
        onSubmit={handleSubmit}
        title={modal.mode === "create" ? "Create School" : "Edit School"}
        fields={fields}
        initialValues={
          modal.entity
            ? { name: modal.entity.name, location: modal.entity.location ?? "" }
            : undefined
        }
        isSubmitting={isSubmitting}
      />

      <DeleteDialog
        open={deleteTarget !== null}
        entityName="School"
        itemName={deleteTarget?.name ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
