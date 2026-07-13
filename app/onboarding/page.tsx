"use client";

import { useState } from "react";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useEntities } from "@/hooks/useEntities";
import { useEntitySearch } from "@/hooks/useEntitySearch";
import { apiClient } from "@/lib/api-client";
import { markOnboardingComplete } from "@/lib/onboarding-state";
import { env } from "@/lib/env";
import type {
  ApiError,
  OnboardingRequest,
  OnboardingResponse,
  Course,
  Professor,
  School,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NEW_SCHOOL_ID = "__new";
const DIRECT_COUNT_THRESHOLD = 21;

interface CourseRow {
  id: string;
  courseId: string;
  code: string;
  name: string;
  professorId: string;
  professorQuery: string;
  newProfessor: string;
  newProfessorConfirmed: boolean;
}

interface PendingCreate {
  kind: "school" | "professor";
  name: string;
  rowId?: string;
}

const emptyCourseRow = (id: string): CourseRow => ({
  id,
  courseId: "",
  code: "",
  name: "",
  professorId: "",
  professorQuery: "",
  newProfessor: "",
  newProfessorConfirmed: false,
});

function courseCommunityLabel(count?: number) {
  const total = typeof count === "number" && Number.isFinite(count) ? count : 0;
  if (total >= DIRECT_COUNT_THRESHOLD) {
    return {
      label: `${total.toLocaleString()} students learning here`,
      detail: "A well-established shared course hub.",
    };
  }
  if (total > 10) {
    return {
      label: "Active shared course hub",
      detail: "Good match for shared materials and study history.",
    };
  }
  if (total > 0) {
    return {
      label: "Matched course hub",
      detail: "Use this to keep materials with the canonical course.",
    };
  }
  return {
    label: "Ready for course materials",
    detail: "A clean hub for this class and future study work.",
  };
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const schools = useEntities<School>("/api/schools");
  const [schoolId, setSchoolId] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [newSchool, setNewSchool] = useState("");
  const [confirmedNewSchool, setConfirmedNewSchool] = useState("");
  const [major, setMajor] = useState("");
  const [semester, setSemester] = useState("Spring 2026");
  const [saved, setSaved] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [rows, setRows] = useState<CourseRow[]>([emptyCourseRow("row-1")]);

  const selectedSchoolId = schoolId === NEW_SCHOOL_ID ? "" : schoolId;
  const schoolSearch = useEntitySearch<School>("/api/schools", schoolQuery);
  const schoolMatches = schoolSearch.data.matches;
  const canOfferSchoolCreation =
    schoolQuery.trim().length > 0 &&
    schoolSearch.data.canCreate &&
    schoolId !== NEW_SCHOOL_ID;

  const updateRow = (id: string, patch: Partial<CourseRow>) => {
    setRows((previous) =>
      previous.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const resetProfessors = () => {
    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        professorId: "",
        professorQuery: "",
        newProfessor: "",
        newProfessorConfirmed: false,
      })),
    );
  };

  const handleSchoolQueryChange = (value: string) => {
    setSchoolQuery(value);
    setSchoolId("");
    setNewSchool("");
    resetProfessors();
  };

  const selectSchool = (school: School) => {
    setSchoolId(school.id);
    setNewSchool(school.id === NEW_SCHOOL_ID ? school.name : "");
    setSchoolQuery(school.name);
    resetProfessors();
  };

  const selectProfessor = (rowId: string, professor: Professor) => {
    updateRow(rowId, {
      professorId: professor.id,
      professorQuery: professor.name,
      newProfessor: "",
      newProfessorConfirmed: false,
    });
  };

  const confirmCreate = () => {
    if (!pendingCreate) return;
    if (pendingCreate.kind === "school") {
      setSchoolId(NEW_SCHOOL_ID);
      setNewSchool(pendingCreate.name);
      setConfirmedNewSchool(pendingCreate.name);
      setSchoolQuery(pendingCreate.name);
      resetProfessors();
    } else if (pendingCreate.rowId) {
      updateRow(pendingCreate.rowId, {
        professorId: "__new",
        professorQuery: pendingCreate.name,
        newProfessor: pendingCreate.name,
        newProfessorConfirmed: true,
      });
    }
    setPendingCreate(null);
  };

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      emptyCourseRow(`row-${Date.now()}`),
    ]);
  };

  const hasSchool = Boolean(
    schoolId && (schoolId !== NEW_SCHOOL_ID || newSchool.trim()),
  );
  const hasMajor = Boolean(major.trim());
  const hasSemester = Boolean(semester.trim());
  const validRows = rows.filter((row) => row.code.trim() && row.name.trim());
  const hasCourse = validRows.length > 0;
  const canSave = hasSchool && hasMajor && hasSemester && hasCourse;

  const handleSave = async () => {
    setAttemptedSave(true);
    setSaveError(null);
    if (!canSave || isSaving) return;

    const payload: OnboardingRequest = {
      school:
        schoolId === NEW_SCHOOL_ID
          ? { name: newSchool.trim(), confirmed: Boolean(confirmedNewSchool) }
          : { id: schoolId },
      semester: semester.trim(),
      courses: validRows.map((row) => ({
        id: row.courseId || undefined,
        code: row.code.trim(),
        name: row.name.trim(),
        professor:
          row.professorId === "__new" && row.newProfessor.trim()
            ? {
                name: row.newProfessor.trim(),
                confirmed: row.newProfessorConfirmed,
              }
            : row.professorId
              ? { id: row.professorId }
              : undefined,
        confirmed: true,
      })),
    };

    setIsSaving(true);
    try {
      // Mock mode has no write endpoint; persist only with a real backend.
      if (!env.useMocks) {
        await apiClient.post<OnboardingResponse>("/api/onboarding", payload);
      }
      markOnboardingComplete(user?.id);
      setSaved(true);
    } catch (error) {
      setSaveError(
        (error as ApiError).message || "Could not save your semester setup.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Set up your semester</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose or create your school, add your major, and enter this
            semester&apos;s courses.
          </p>
        </div>

        {saved && (
          <Card className="rounded-lg border-green-200 bg-green-50 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-green-900">
                Setup saved. Continue to your dashboard to open a course
                workspace.
              </p>
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle>Student Context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="school-search">School</Label>
              <Input
                id="school-search"
                placeholder="Search school or type a new one"
                value={schoolQuery}
                onChange={(event) =>
                  handleSchoolQueryChange(event.target.value)
                }
                autoComplete="off"
              />

              {schoolQuery.trim() && schoolMatches.length > 0 && (
                <div
                  className="overflow-hidden rounded-md border"
                  role="listbox"
                  aria-label="School suggestions"
                >
                  <p className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    Did you mean?
                  </p>
                  {schoolMatches.map(({ item: school, strong }) => (
                    <button
                      key={school.id}
                      type="button"
                      role="option"
                      aria-selected={school.id === schoolId}
                      className="flex w-full items-center justify-between border-t px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => selectSchool(school)}
                    >
                      <span>
                        <span className="block font-medium">{school.name}</span>
                        {(school.shortName || school.location) && (
                          <span className="block text-xs text-muted-foreground">
                            {[school.shortName, school.location]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                      {strong && (
                        <span className="text-xs text-muted-foreground">
                          Match
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {canOfferSchoolCreation && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="text-muted-foreground">
                    No strong school match found.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() =>
                      setPendingCreate({
                        kind: "school",
                        name: schoolQuery.trim(),
                      })
                    }
                  >
                    Create new &quot;{schoolQuery.trim()}&quot;
                  </Button>
                </div>
              )}

              {schoolId === NEW_SCHOOL_ID && (
                <p className="text-sm">
                  New school: <span className="font-medium">{newSchool}</span>
                </p>
              )}
              {selectedSchoolId && (
                <p className="text-sm text-muted-foreground">
                  Selected:{" "}
                  <span className="font-medium text-foreground">
                    {schools.data.find((school) => school.id === selectedSchoolId)
                      ?.name ?? schoolQuery}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                placeholder="Type your major, e.g. Computer Science"
                value={major}
                onChange={(event) => setMajor(event.target.value)}
                aria-invalid={attemptedSave && !hasMajor}
              />
              {attemptedSave && !hasMajor && (
                <p className="text-xs text-destructive">
                  Enter your major to continue.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input
                id="semester"
                value={semester}
                onChange={(event) => setSemester(event.target.value)}
                aria-invalid={attemptedSave && !hasSemester}
              />
              {attemptedSave && !hasSemester && (
                <p className="text-xs text-destructive">
                  Enter the current semester.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Current Courses</CardTitle>
            <Button type="button" variant="outline" onClick={addRow}>
              Add Row
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden grid-cols-[8rem_1fr_16rem] gap-3 text-sm font-medium text-muted-foreground md:grid">
              <span>Code</span>
              <span>Course</span>
              <span>Professor</span>
            </div>
            {rows.map((row) => (
              <CourseRowEditor
                key={row.id}
                row={row}
                hasSchool={hasSchool}
                selectedSchoolId={selectedSchoolId}
                schoolLabel={newSchool || schoolQuery}
                updateRow={updateRow}
                selectProfessor={selectProfessor}
                requestCreateProfessor={(name) =>
                  setPendingCreate({
                    kind: "professor",
                    name,
                    rowId: row.id,
                  })
                }
              />
            ))}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save and continue"}
              </Button>
            </div>
            {attemptedSave && !canSave && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Complete the required setup fields:
                <span className="ml-1">
                  {[
                    !hasSchool && "school",
                    !hasMajor && "major",
                    !hasSemester && "semester",
                    !hasCourse && "at least one course code and name",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  .
                </span>
              </div>
            )}
            {saveError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {saveError}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={pendingCreate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCreate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create new {pendingCreate?.kind ?? "entry"}?
            </DialogTitle>
            <DialogDescription>
              No strong existing match was found for &quot;
              {pendingCreate?.name}&quot;. Confirm the spelling before creating
              it
              {pendingCreate?.kind === "professor"
                ? ` at ${newSchool || schoolQuery}`
                : ""}
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingCreate(null)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmCreate}>
              Confirm create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}

interface CourseRowEditorProps {
  row: CourseRow;
  hasSchool: boolean;
  selectedSchoolId: string;
  schoolLabel: string;
  updateRow: (id: string, patch: Partial<CourseRow>) => void;
  selectProfessor: (rowId: string, professor: Professor) => void;
  requestCreateProfessor: (name: string) => void;
}

function CourseRowEditor({
  row,
  hasSchool,
  selectedSchoolId,
  schoolLabel,
  updateRow,
  selectProfessor,
  requestCreateProfessor,
}: CourseRowEditorProps) {
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const courseSearchQuery = row.code.trim() || row.name.trim();
  const schoolCourses = useEntities<Course>(
    selectedSchoolId ? `/api/schools/${selectedSchoolId}/courses` : "/api/courses",
    undefined,
    hasSchool && Boolean(selectedSchoolId),
  );
  const courseSearch = useEntitySearch<Course>(
    selectedSchoolId ? `/api/schools/${selectedSchoolId}/courses` : "/api/courses",
    courseSearchQuery,
    undefined,
    hasSchool && Boolean(selectedSchoolId) && Boolean(courseSearchQuery),
  );
  const professorSearch = useEntitySearch<Professor>(
    selectedSchoolId
      ? `/api/schools/${selectedSchoolId}/professors`
      : "/api/professors",
    row.professorQuery,
    undefined,
    hasSchool && Boolean(selectedSchoolId),
  );
  const professorMatches = professorSearch.data.matches;
  const visibleCourseSuggestions = courseSearchQuery
    ? courseSearch.data.matches.map(({ item, strong }) => ({ course: item, strong }))
    : schoolCourses.data.slice(0, 8).map((course) => ({ course, strong: false }));
  const canOfferCourseCreation =
    hasSchool &&
    Boolean(selectedSchoolId) &&
    Boolean(courseSearchQuery) &&
    row.courseId !== "__new" &&
    courseSearch.data.canCreate &&
    !courseSearch.isLoading;
  const canOfferProfessorCreation =
    hasSchool &&
    row.professorQuery.trim().length > 0 &&
    (selectedSchoolId ? professorSearch.data.canCreate : true) &&
    row.professorId !== "__new";
  const selectCourse = (course: Course) => {
    updateRow(row.id, {
      courseId: course.id,
      code: course.code,
      name: course.name,
      professorId: course.professorId,
      professorQuery: "",
      newProfessor: "",
      newProfessorConfirmed: false,
    });
    setCoursePickerOpen(false);
  };
  const keepAsNewCourse = () => {
    updateRow(row.id, {
      courseId: "",
      professorId: "",
      professorQuery: "",
      newProfessor: "",
      newProfessorConfirmed: false,
    });
    setCoursePickerOpen(false);
  };

  return (
    <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[8rem_1fr_16rem]">
      <Input
        aria-label="Course code"
        placeholder="CSE 101"
        value={row.code}
        disabled={!hasSchool}
        onFocus={() => setCoursePickerOpen(true)}
        onChange={(event) =>
          updateRow(row.id, { code: event.target.value, courseId: "" })
        }
      />
      <div className="space-y-2">
        <Input
          aria-label="Course name"
          placeholder={hasSchool ? "Design and Analysis of Algorithms" : "Select a school first"}
          value={row.name}
          disabled={!hasSchool}
          onFocus={() => setCoursePickerOpen(true)}
          onChange={(event) =>
            updateRow(row.id, { name: event.target.value, courseId: "" })
          }
        />
        {coursePickerOpen && hasSchool && selectedSchoolId && (
          <div
            className="overflow-hidden rounded-md border"
            role="listbox"
            aria-label="Course suggestions"
          >
            <p className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              {courseSearchQuery ? "Best existing matches" : "Existing courses at this school"}
            </p>
            {visibleCourseSuggestions.map(({ course, strong }) => {
              const community = courseCommunityLabel(course.enrollmentCount);
              return (
                <button
                  key={course.id}
                  type="button"
                  role="option"
                  aria-selected={course.id === row.courseId}
                  className="flex w-full items-start justify-between gap-3 border-t px-3 py-3 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCourse(course)}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{course.code}</span>
                    <span className="block text-xs text-muted-foreground">
                      {course.name}
                    </span>
                    <span className="mt-2 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-950">
                      <UsersRound
                        className="mt-0.5 size-3.5 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {community.label}
                        </span>
                        <span className="block text-emerald-800">
                          {community.detail}
                        </span>
                      </span>
                    </span>
                  </span>
                  {strong && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      Match
                    </span>
                  )}
                </button>
              );
            })}
            {visibleCourseSuggestions.length === 0 &&
              !courseSearch.isLoading &&
              !schoolCourses.isLoading && (
              <div className="border-t px-3 py-3 text-sm">
                <p className="text-muted-foreground">
                  No existing course match yet.
                </p>
              </div>
            )}
            {canOfferCourseCreation && (
              <button
                type="button"
                className="flex w-full items-start gap-2 border-t px-3 py-3 text-left text-sm hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={keepAsNewCourse}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  +
                </span>
                <span>
                  <span className="block font-medium">
                    Create a new course from this entry
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Save it as a clean hub for this class.
                  </span>
                </span>
              </button>
            )}
          </div>
        )}
        {hasSchool &&
          courseSearchQuery &&
          courseSearch.debouncedQuery &&
          !courseSearch.isLoading &&
          courseSearch.data.matches.length === 0 && (
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Ready for a new course hub.
              </span>{" "}
              Save this entry if it should become the canonical course.
            </div>
          )}
      </div>
      <div className="space-y-2">
        <Input
          aria-label="Professor search"
          placeholder={hasSchool ? "Search professor" : "Select a school first"}
          value={row.professorQuery}
          disabled={!hasSchool}
          onChange={(event) =>
            updateRow(row.id, {
              professorQuery: event.target.value,
              professorId: "",
              newProfessor: "",
              newProfessorConfirmed: false,
            })
          }
          autoComplete="off"
        />

        {row.professorQuery.trim() && professorMatches.length > 0 && (
          <div
            className="overflow-hidden rounded-md border"
            role="listbox"
            aria-label="Professor suggestions"
          >
            <p className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              Did you mean?
            </p>
            {professorMatches.map(({ item: professor }) => (
              <button
                key={professor.id}
                type="button"
                role="option"
                aria-selected={professor.id === row.professorId}
                className="w-full border-t px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => selectProfessor(row.id, professor)}
              >
                <span className="block font-medium">{professor.name}</span>
                {professor.department && (
                  <span className="block text-xs text-muted-foreground">
                    {professor.department}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {canOfferProfessorCreation && (
          <Button
            type="button"
            variant="outline"
            className="w-full whitespace-normal"
            onClick={() => requestCreateProfessor(row.professorQuery.trim())}
          >
            Create new &quot;{row.professorQuery.trim()}&quot;
          </Button>
        )}

        {row.professorId === "__new" && (
          <p className="text-xs text-muted-foreground">
            New professor at {schoolLabel}:{" "}
            <span className="font-medium text-foreground">
              {row.newProfessor}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
