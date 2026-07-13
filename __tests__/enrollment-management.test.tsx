import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "student@example.edu",
      name: "Demo Student",
      subscriptionTier: "FREE",
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const course = {
  id: "course-cse101",
  name: "Design and Analysis of Algorithms",
  code: "CSE 101",
  schoolId: "school-ucsd",
  professorId: "prof-smith",
  createdAt: "2026-01-08T08:00:00.000Z",
};

const { apiGet, apiDelete } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
    delete: apiDelete,
  },
}));

describe("enrollment management", () => {
  beforeEach(() => {
    let hasLeftCourse = false;
    apiGet.mockReset();
    apiDelete.mockReset();
    apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === "/api/schools") {
        return Promise.resolve([
          {
            id: "school-ucsd",
            name: "UC San Diego",
            location: "La Jolla, CA",
            createdAt: "2026-01-05T08:00:00.000Z",
          },
        ]);
      }
      if (endpoint === "/api/professors") {
        return Promise.resolve([
          {
            id: "prof-smith",
            name: "Dana Smith",
            department: "Computer Science",
            schoolId: "school-ucsd",
            createdAt: "2026-01-06T08:00:00.000Z",
          },
        ]);
      }
      if (endpoint === "/api/courses") {
        return Promise.resolve(hasLeftCourse ? [] : [course]);
      }
      return Promise.resolve([]);
    });
    apiDelete.mockImplementation(() => {
      hasLeftCourse = true;
      return Promise.resolve(undefined);
    });
  });

  it("lists enrolled courses and leaves after confirmation", async () => {
    render(<DashboardPage />);

    expect(
      await screen.findByText("Design and Analysis of Algorithms"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Leave course" }));

    expect(
      screen.getByRole("heading", { name: "Leave course?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The course itself will not be deleted/),
    ).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Leave course" }));

    await waitFor(() => {
      expect(apiDelete).toHaveBeenCalledWith("/api/enrollments", {
        params: { courseId: "course-cse101" },
      });
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Leave course?" }),
      ).not.toBeInTheDocument();
    });
    expect(
      apiGet.mock.calls.filter(([endpoint]) => endpoint === "/api/courses"),
    ).toHaveLength(2);
    expect(
      await screen.findByRole("heading", { name: "Add your first course" }),
    ).toBeInTheDocument();
  });
});
