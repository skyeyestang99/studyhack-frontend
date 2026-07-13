import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/onboarding/page";

interface CourseInput {
  id?: string;
  code: string;
  name: string;
  confirmed?: boolean;
  professor?: unknown;
}

interface OnboardingPayload {
  school: { id?: string; name?: string; confirmed?: boolean };
  semester: string;
  courses: CourseInput[];
}

interface MockCourse extends CourseInput {
  id: string;
}

const { apiGet, apiPost } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/onboarding",
}));

vi.mock("@/components/auth/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "student@example.edu",
      name: "Demo Student",
      subscriptionTier: "FREE",
    },
    token: null,
    isAuthenticated: true,
    isLoaded: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/lib/env", () => ({
  env: {
    apiUrl: "http://localhost:8080",
    useMocks: false,
  },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
    post: apiPost,
  },
}));

const normalizeCode = (code: string) =>
  code.toUpperCase().replace(/\s+/g, "");

function createMockApi(existingCourses: MockCourse[] = []) {
  const courses = new Map(
    existingCourses.map((course) => [normalizeCode(course.code), course]),
  );
  const enrollments = new Set<string>();

  apiGet.mockImplementation(
    async (endpoint: string, options?: { params?: { q?: string } }) => {
      if (endpoint === "/api/schools" && options?.params?.q) {
        return { matches: [], canCreate: true, threshold: 0.65 };
      }
      if (endpoint === "/api/schools") {
        return [];
      }
      return { matches: [], canCreate: true, threshold: 0.65 };
    },
  );

  apiPost.mockImplementation(
    async (endpoint: string, payload: OnboardingPayload) => {
      expect(endpoint).toBe("/api/onboarding");

      const enrolled = payload.courses.map((input) => {
        const key = normalizeCode(input.code);
        let course = courses.get(key);
        if (!course) {
          course = {
            id: `course-${courses.size + 1}`,
            code: input.code,
            name: input.name,
          };
          courses.set(key, course);
        }
        enrollments.add(`user-1:${course.id}`);
        return {
          courseId: course.id,
          code: input.code,
          name: input.name,
        };
      });

      return { schoolId: "school-new", enrolled };
    },
  );

  return { courses, enrollments };
}

async function completeOnboarding(courses: CourseInput[]) {
  render(<OnboardingPage />);

  const schoolSearch = await screen.findByPlaceholderText(
    "Search school or type a new one",
  );
  fireEvent.change(schoolSearch, {
    target: { value: "Northbridge University" },
  });
  fireEvent.click(
    await screen.findByRole("button", {
      name: 'Create new "Northbridge University"',
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm create" }));

  fireEvent.change(screen.getByPlaceholderText("Type your major, e.g. Computer Science"), {
    target: { value: "Computer Science" },
  });

  for (let index = 1; index < courses.length; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));
  }

  const codeInputs = screen.getAllByPlaceholderText("CSE 101");
  const nameInputs = screen.getAllByPlaceholderText(
    "Design and Analysis of Algorithms",
  );
  courses.forEach((course, index) => {
    fireEvent.change(codeInputs[index], { target: { value: course.code } });
    fireEvent.change(nameInputs[index], { target: { value: course.name } });
  });

  fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
  await screen.findByText(/Setup saved\. Continue/);
}

describe("onboarding and enrollment", () => {
  beforeEach(() => {
    localStorage.clear();
    apiGet.mockReset();
    apiPost.mockReset();
    apiGet.mockResolvedValue([]);
  });

  it("creates each course and enrolls the signed-in student through the onboarding API", async () => {
    const mockApi = createMockApi();

    await completeOnboarding([
      { code: "CSE 101", name: "Design and Analysis of Algorithms" },
      { code: "MATH 20C", name: "Calculus and Analytic Geometry" },
    ]);

    expect(apiPost).toHaveBeenCalledWith("/api/onboarding", {
      school: { name: "Northbridge University", confirmed: true },
      semester: "Spring 2026",
      courses: [
        {
          id: undefined,
          code: "CSE 101",
          name: "Design and Analysis of Algorithms",
          professor: undefined,
          confirmed: true,
        },
        {
          id: undefined,
          code: "MATH 20C",
          name: "Calculus and Analytic Geometry",
          professor: undefined,
          confirmed: true,
        },
      ],
    });
    expect(mockApi.courses).toHaveLength(2);
    expect(mockApi.enrollments).toEqual(
      new Set(["user-1:course-1", "user-1:course-2"]),
    );
    expect(localStorage.getItem("studyai:onboarding-complete:user-1")).toBe(
      "true",
    );
  });

  it("reuses an existing normalized course instead of creating a duplicate", async () => {
    const existingCourse = {
      id: "course-existing",
      code: "CSE101",
      name: "Design and Analysis of Algorithms",
    };
    const mockApi = createMockApi([existingCourse]);

    await completeOnboarding([
      { code: "cse 101", name: "Design and Analysis of Algorithms" },
    ]);

    await waitFor(() => expect(apiPost).toHaveBeenCalledOnce());
    expect(mockApi.courses).toHaveLength(1);
    expect(mockApi.courses.get("CSE101")).toBe(existingCourse);
    expect(mockApi.enrollments).toEqual(
      new Set(["user-1:course-existing"]),
    );
  });
});
