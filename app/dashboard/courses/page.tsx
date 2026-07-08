"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEntities } from "@/hooks/useEntities";
import { useEntityModal } from "@/hooks/useEntityModal";
import { EntityTable, type Column } from "@/components/dashboard/EntityTable";
import { DeleteDialog } from "@/components/dashboard/DeleteDialog";
import { LoadingState } from "@/components/dashboard/LoadingState";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ErrorState } from "@/components/dashboard/ErrorState";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import type { Course, Professor, School, ApiError } from "@/types/api";

export default function CoursesPage() {
  const router = useRouter();
  // Filter state
  const [filterSchoolId, setFilterSchoolId] = useState<string>("");
  const [filterProfessorId, setFilterProfessorId] = useState<string>("");

  const coursesParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filterSchoolId) params.schoolId = filterSchoolId;
    if (filterProfessorId) params.professorId = filterProfessorId;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [filterSchoolId, filterProfessorId]);

  const {
    data: courses,
    isLoading,
    error,
    refresh,
  } = useEntities<Course>("/api/courses", coursesParams);

  const { data: schools } = useEntities<School>("/api/schools");
  const { data: professors } = useEntities<Professor>("/api/professors");

  const modal = useEntityModal<Course>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal form state
  const [modalValues, setModalValues] = useState<Record<string, string>>({});
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

  // Lookup maps for displaying school/professor names in the table
  const schoolMap = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [schools]);

  const professorMap = useMemo(() => {
    const map = new Map<string, string>();
    professors.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [professors]);

  // Cascading: filter professors by selected school in the modal
  const modalProfessorOptions = useMemo(() => {
    const schoolId = modalValues.schoolId;
    if (!schoolId) return [];
    return professors
      .filter((p) => p.schoolId === schoolId)
      .map((p) => ({ value: p.id, label: p.name }));
  }, [professors, modalValues.schoolId]);

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ value: s.id, label: s.name })),
    [schools],
  );

  const columns: Column<Course>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "code", header: "Code" },
      {
        key: "schoolId",
        header: "School",
        render: (value) => schoolMap.get(value as string) ?? "Unknown",
      },
      {
        key: "professorId",
        header: "Professor",
        render: (value) => professorMap.get(value as string) ?? "Unknown",
      },
      {
        key: "createdAt",
        header: "Created At",
        render: (value) => new Date(value as string).toLocaleDateString(),
      },
    ],
    [schoolMap, professorMap],
  );

  // Reset modal form when it opens/closes
  useEffect(() => {
    if (modal.open) {
      if (modal.mode === "edit" && modal.entity) {
        setModalValues({
          name: modal.entity.name,
          code: modal.entity.code,
          schoolId: modal.entity.schoolId,
          professorId: modal.entity.professorId,
        });
      } else {
        setModalValues({ name: "", code: "", schoolId: "", professorId: "" });
      }
      setModalErrors({});
    }
  }, [modal.open, modal.mode, modal.entity]);

  const handleModalFieldChange = (name: string, value: string) => {
    setModalValues((prev) => {
      const next = { ...prev, [name]: value };
      // Cascading: when school changes, reset professor selection
      if (name === "schoolId" && prev.schoolId !== value) {
        next.professorId = "";
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!modalValues.name?.trim()) newErrors.name = "Name is required";
    if (!modalValues.code?.trim()) newErrors.code = "Code is required";
    if (!modalValues.schoolId) newErrors.schoolId = "School is required";
    if (!modalValues.professorId)
      newErrors.professorId = "Professor is required";

    if (Object.keys(newErrors).length > 0) {
      setModalErrors(newErrors);
      return;
    }

    setModalErrors({});
    setIsSubmitting(true);
    try {
      const payload = {
        name: modalValues.name,
        code: modalValues.code,
        schoolId: modalValues.schoolId,
        professorId: modalValues.professorId,
        confirmed: modal.mode === "create" ? true : undefined,
      };
      if (modal.mode === "create") {
        await apiClient.post("/api/courses", payload);
        toast.success("Course created successfully");
      } else {
        await apiClient.put(`/api/courses/${modal.entity!.id}`, payload);
        toast.success("Course updated successfully");
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
      await apiClient.delete(`/api/courses/${deleteTarget.id}`);
      toast.success("Course deleted successfully");
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
    setFilterSchoolId(value === "all" ? "" : value);
  };

  const handleProfessorFilterChange = (value: string) => {
    setFilterProfessorId(value === "all" ? "" : value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Courses</h1>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Courses</h1>
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        <Button onClick={modal.openCreate}>Create Course</Button>
      </div>

      <div className="flex gap-4">
        <Select
          value={filterSchoolId || "all"}
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

        <Select
          value={filterProfessorId || "all"}
          onValueChange={handleProfessorFilterChange}
        >
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Filter by professor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Professors</SelectItem>
            {professors.map((professor) => (
              <SelectItem key={professor.id} value={professor.id}>
                {professor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          message="No courses yet"
          actionLabel="Create Course"
          onAction={modal.openCreate}
        />
      ) : (
        <EntityTable
          columns={columns}
          data={courses}
          onEdit={modal.openEdit}
          onDelete={setDeleteTarget}
          onRowClick={(course) => router.push(`/courses/${course.id}`)}
        />
      )}

      {/* Custom Course Modal with cascading school → professor dropdown */}
      <Dialog
        open={modal.open}
        onOpenChange={(isOpen) => !isOpen && modal.close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal.mode === "create" ? "Create Course" : "Edit Course"}
            </DialogTitle>
            <DialogDescription>
              Fill in the fields below and click save.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="course-name">Name</Label>
              <Input
                id="course-name"
                placeholder="Course name"
                value={modalValues.name ?? ""}
                onChange={(e) => handleModalFieldChange("name", e.target.value)}
              />
              {modalErrors.name && (
                <p className="text-sm text-destructive">{modalErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-code">Code</Label>
              <Input
                id="course-code"
                placeholder="Course code"
                value={modalValues.code ?? ""}
                onChange={(e) => handleModalFieldChange("code", e.target.value)}
              />
              {modalErrors.code && (
                <p className="text-sm text-destructive">{modalErrors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-school">School</Label>
              <Select
                value={modalValues.schoolId ?? ""}
                onValueChange={(val) => handleModalFieldChange("schoolId", val)}
              >
                <SelectTrigger id="course-school">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schoolOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modalErrors.schoolId && (
                <p className="text-sm text-destructive">
                  {modalErrors.schoolId}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-professor">Professor</Label>
              <Select
                value={modalValues.professorId ?? ""}
                onValueChange={(val) =>
                  handleModalFieldChange("professorId", val)
                }
                disabled={!modalValues.schoolId}
              >
                <SelectTrigger id="course-professor">
                  <SelectValue
                    placeholder={
                      modalValues.schoolId
                        ? "Select a professor"
                        : "Select a school first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {modalProfessorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modalErrors.professorId && (
                <p className="text-sm text-destructive">
                  {modalErrors.professorId}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={modal.close}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={deleteTarget !== null}
        entityName="Course"
        itemName={deleteTarget?.name ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
