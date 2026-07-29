import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

const { useEntitiesMock } = vi.hoisted(() => ({
  useEntitiesMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "New Student" },
  }),
}));

vi.mock("@/hooks/useEntities", () => ({
  useEntities: useEntitiesMock,
}));

vi.mock("@/components/dashboard/ExamReminderStrip", () => ({
  ExamReminderStrip: () => <div>Exam reminders</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      aria-label="Filter by school"
      value={value}
      onChange={(event) => onValueChange(event.currentTarget.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const loadedResult = {
  data: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
};

describe("dashboard enrollment states", () => {
  beforeEach(() => {
    useEntitiesMock.mockReset();
    useEntitiesMock.mockReturnValue(loadedResult);
  });

  it("shows a dashboard skeleton while course data is loading", () => {
    useEntitiesMock.mockImplementation((endpoint: string) => ({
      ...loadedResult,
      isLoading: endpoint === "/api/courses",
    }));

    render(<DashboardPage />);

    expect(
      screen.getByRole("status", { name: "Loading dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading your courses")).toBeInTheDocument();
    expect(screen.queryByText("Add your first course")).not.toBeInTheDocument();
  });

  it("shows a first-course CTA when the user has no enrollments", () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole("heading", { name: "Add your first course" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/organize materials, ask questions/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a course" })).toHaveAttribute(
      "href",
      "/onboarding",
    );
    expect(screen.queryByText("Exam reminders")).not.toBeInTheDocument();
    expect(screen.queryByText("No courses match this school.")).not.toBeInTheDocument();
  });

  it("links to course creation with the selected school prefilled", () => {
    useEntitiesMock.mockImplementation((endpoint: string) => {
      if (endpoint === "/api/schools") {
        return {
          ...loadedResult,
          data: [
            {
              id: "school-ucsd",
              name: "UC San Diego",
              shortName: "UCSD",
              aliases: [],
              location: "San Diego, CA",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
            {
              id: "school-uci",
              name: "University of California, Irvine",
              shortName: "UCI",
              aliases: [],
              location: "Irvine, CA",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        };
      }
      if (endpoint === "/api/professors") {
        return {
          ...loadedResult,
          data: [
            {
              id: "prof-smith",
              name: "Prof. Smith",
              shortName: null,
              aliases: [],
              department: null,
              schoolId: "school-ucsd",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        };
      }
      if (endpoint === "/api/courses") {
        return {
          ...loadedResult,
          data: [
            {
              id: "course-math20d",
              code: "MATH 20D",
              name: "Differential Equations",
              schoolId: "school-ucsd",
              professorId: "prof-smith",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        };
      }
      return loadedResult;
    });

    render(<DashboardPage />);

    fireEvent.change(screen.getByLabelText("Filter by school"), {
      target: { value: "school-uci" },
    });

    expect(screen.getByText("No courses match this school.")).toBeInTheDocument();
    expect(
      screen.getByText(/Create a course for this school/i),
    ).toBeInTheDocument();
    screen.getAllByRole("link", { name: /Create course/i }).forEach((link) => {
      expect(link).toHaveAttribute("href", "/onboarding?schoolId=school-uci");
    });
    expect(screen.getByRole("button", { name: "Show all courses" })).toBeInTheDocument();
  });

  it("shows course creation when the selected school already has courses", () => {
    useEntitiesMock.mockImplementation((endpoint: string) => {
      if (endpoint === "/api/schools") {
        return {
          ...loadedResult,
          data: [
            {
              id: "school-ucsd",
              name: "UC San Diego",
              shortName: "UCSD",
              aliases: [],
              location: "San Diego, CA",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        };
      }
      if (endpoint === "/api/professors") {
        return {
          ...loadedResult,
          data: [
            {
              id: "prof-smith",
              name: "Prof. Smith",
              shortName: null,
              aliases: [],
              department: null,
              schoolId: "school-ucsd",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        };
      }
      if (endpoint === "/api/courses") {
        return {
          ...loadedResult,
          data: [
            {
              id: "course-math20d",
              code: "MATH 20D",
              name: "Differential Equations",
              schoolId: "school-ucsd",
              professorId: "prof-smith",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        };
      }
      return loadedResult;
    });

    render(<DashboardPage />);

    fireEvent.change(screen.getByLabelText("Filter by school"), {
      target: { value: "school-ucsd" },
    });

    expect(screen.getByText("Differential Equations")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create course/i })).toHaveAttribute(
      "href",
      "/onboarding?schoolId=school-ucsd",
    );
  });
});
