"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useEntities } from "@/hooks/useEntities";
import { markOnboardingComplete } from "@/lib/onboarding-state";
import type { Professor, School } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseRow {
  id: string;
  code: string;
  name: string;
  professorId: string;
  newProfessor: string;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const schools = useEntities<School>("/api/schools");
  const professors = useEntities<Professor>("/api/professors");
  const [schoolId, setSchoolId] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [newSchool, setNewSchool] = useState("");
  const [major, setMajor] = useState("");
  const [semester, setSemester] = useState("Spring 2026");
  const [saved, setSaved] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [rows, setRows] = useState<CourseRow[]>([
    {
      id: "row-1",
      code: "",
      name: "",
      professorId: "",
      newProfessor: "",
    },
  ]);

  const selectedSchoolId = schoolId === "__new" ? "" : schoolId;
  const filteredSchools = useMemo(() => {
    const query = schoolQuery.trim().toLowerCase();
    if (!query) return schools.data;
    return schools.data.filter((school) =>
      school.name.toLowerCase().includes(query),
    );
  }, [schoolQuery, schools.data]);
  const showCreateSchoolHint =
    schoolQuery.trim().length > 0 &&
    filteredSchools.length === 0 &&
    schoolId !== "__new";
  const professorOptions = useMemo(() => {
    if (!selectedSchoolId) return professors.data;
    return professors.data.filter((prof) => prof.schoolId === selectedSchoolId);
  }, [professors.data, selectedSchoolId]);

  const updateRow = (id: string, patch: Partial<CourseRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        code: "",
        name: "",
        professorId: "",
        newProfessor: "",
      },
    ]);
  };

  const hasSchool = Boolean(
    schoolId && (schoolId !== "__new" || newSchool.trim()),
  );
  const hasMajor = Boolean(major.trim());
  const hasSemester = Boolean(semester.trim());
  const hasCourse = rows.some((row) => row.code.trim() && row.name.trim());
  const canSave = hasSchool && hasMajor && hasSemester && hasCourse;

  const handleSave = () => {
    setAttemptedSave(true);
    if (!canSave) return;
    markOnboardingComplete(user?.id);
    setSaved(true);
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
                Setup saved for this session. Continue to your dashboard to open
                a course workspace.
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
              <Label>School</Label>
              <Input
                placeholder="Search school or type a new one"
                value={schoolQuery}
                onChange={(e) => setSchoolQuery(e.target.value)}
              />
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or create school" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSchools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new">Create new school</SelectItem>
                </SelectContent>
              </Select>
              {showCreateSchoolHint && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="text-muted-foreground">
                    No school found for &quot;{schoolQuery.trim()}&quot;.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => {
                      setSchoolId("__new");
                      setNewSchool(schoolQuery.trim());
                    }}
                  >
                    Create new school
                  </Button>
                </div>
              )}
              {schoolId === "__new" && (
                <Input
                  placeholder="School name"
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                placeholder="Type your major, e.g. Computer Science"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
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
                onChange={(e) => setSemester(e.target.value)}
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
              <div
                key={row.id}
                className="grid gap-3 rounded-md border p-3 md:grid-cols-[8rem_1fr_16rem]"
              >
                <Input
                  placeholder="CSE 101"
                  value={row.code}
                  onChange={(e) => updateRow(row.id, { code: e.target.value })}
                />
                <Input
                  placeholder="Design and Analysis of Algorithms"
                  value={row.name}
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                />
                <div className="space-y-2">
                  <Select
                    value={row.professorId}
                    onValueChange={(value) =>
                      updateRow(row.id, { professorId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select/create professor" />
                    </SelectTrigger>
                    <SelectContent>
                      {professorOptions.map((professor) => (
                        <SelectItem key={professor.id} value={professor.id}>
                          {professor.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new">Create new professor</SelectItem>
                    </SelectContent>
                  </Select>
                  {row.professorId === "__new" && (
                    <Input
                      placeholder="Professor name"
                      value={row.newProfessor}
                      onChange={(e) =>
                        updateRow(row.id, { newProfessor: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <Button onClick={handleSave}>Save and continue</Button>
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
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
