import { render, screen } from "@testing-library/react";
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
});
