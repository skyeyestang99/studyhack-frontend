import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/onboarding/page";
import { MaterialList } from "@/components/dashboard/MaterialList";
import { MaterialPreviewDialog } from "@/components/dashboard/MaterialPreviewDialog";
import { UploadDialog } from "@/components/dashboard/UploadDialog";
import type { StudyMaterialResponse } from "@/types/api";

// These are component-level integration tests with mocked routing, auth, env,
// and API data. Browser-level E2E coverage should live in a separate suite.
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
      id: "mock-user",
      email: "student@example.edu",
      name: "Demo Student",
      subscriptionTier: "FREE",
    },
    token: "mock-token",
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
  }),
}));

vi.mock("@/lib/env", () => ({
  env: {
    apiUrl: "http://localhost:8080",
    useMocks: true,
  },
}));

const { apiGet, apiPost } = vi.hoisted(() => {
  const school = {
    id: "school-ucsd",
    name: "UC San Diego",
    shortName: "UC San Diego",
    aliases: ["UCSD", "University of California San Diego"],
    location: "La Jolla, CA",
    createdAt: "2026-01-05T08:00:00.000Z",
  };
  const professor = {
    id: "prof-smith",
    name: "Dana Smith",
    department: "Computer Science",
    schoolId: "school-ucsd",
    createdAt: "2026-01-06T08:00:00.000Z",
  };
  return {
  apiGet: vi.fn((endpoint: string, config?: { params?: Record<string, string> }) => {
    const q = config?.params?.q?.toLowerCase();
    if (endpoint === "/api/schools") {
      if (q) {
        const matched = q === "ucsd";
        return Promise.resolve({
          matches: matched
            ? [{ item: school, score: 1, strong: true }]
            : [],
          canCreate: !matched,
          threshold: 0.65,
        });
      }
      return Promise.resolve([school]);
    }
    if (endpoint === "/api/professors" || endpoint === "/api/schools/school-ucsd/professors") {
      if (q) {
        const matched = q === "d smith";
        return Promise.resolve({
          matches: matched
            ? [{ item: professor, score: 0.8, strong: true }]
            : [],
          canCreate: !matched,
          threshold: 0.65,
        });
      }
      return Promise.resolve([professor]);
    }
    if (endpoint === "/api/courses" || endpoint === "/api/schools/school-ucsd/courses") {
      if (q) {
        return Promise.resolve({
          matches: [],
          canCreate: true,
          threshold: 0.65,
        });
      }
      return Promise.resolve([]);
    }
    return Promise.resolve([]);
  }),
  apiPost: vi.fn(() =>
    Promise.resolve({ schoolId: "school-ucsd", enrolled: [] }),
  ),
};
});

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
    post: apiPost,
  },
}));

const UNKNOWN_SCHOOL_NAME = "Northbridge Demo University";

describe("student workspace flows", () => {
  beforeEach(() => {
    apiGet.mockClear();
    apiPost.mockClear();
  });

  it("ranks UC San Diego first for its acronym and suppresses creation", async () => {
    render(<OnboardingPage />);

    const searchInput = await screen.findByPlaceholderText(
      "Search school or type a new one",
    );
    fireEvent.change(searchInput, { target: { value: "ucsd" } });

    const suggestions = await screen.findByRole("listbox", {
      name: "School suggestions",
    });
    expect(suggestions).toHaveTextContent("Did you mean?");
    expect(await screen.findByRole("option", { name: /UC San Diego/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Create new "ucsd"/ }),
    ).not.toBeInTheDocument();
  });

  it("requires confirmation before selecting an unmatched new school", async () => {
    render(<OnboardingPage />);

    const searchInput = await screen.findByPlaceholderText(
      "Search school or type a new one",
    );
    fireEvent.change(searchInput, {
      target: { value: UNKNOWN_SCHOOL_NAME },
    });

    expect(await screen.findByText("No strong school match found.")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: `Create new "${UNKNOWN_SCHOOL_NAME}"`,
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Create new school?" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(`New school: ${UNKNOWN_SCHOOL_NAME}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm create" }));

    await waitFor(() =>
      expect(screen.getByText("New school:")).toBeInTheDocument(),
    );
  });

  it("searches professors only after a school is selected", async () => {
    render(<OnboardingPage />);

    const schoolSearch = await screen.findByPlaceholderText(
      "Search school or type a new one",
    );
    expect(screen.getByLabelText("Professor search")).toBeDisabled();

    fireEvent.change(schoolSearch, { target: { value: "ucsd" } });
    fireEvent.click(await screen.findByRole("option", { name: /UC San Diego/ }));

    const professorSearch = screen.getByLabelText("Professor search");
    expect(professorSearch).toBeEnabled();
    fireEvent.change(professorSearch, { target: { value: "d smith" } });

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Dana Smith/ }),
      ).toBeInTheDocument();
    });
    expect(apiGet).toHaveBeenCalledWith("/api/schools/school-ucsd/professors", {
      params: { q: "d smith" },
    });
  });

  it("requires confirmation before selecting a new professor at the school", async () => {
    render(<OnboardingPage />);

    const schoolSearch = await screen.findByPlaceholderText(
      "Search school or type a new one",
    );
    fireEvent.change(schoolSearch, { target: { value: "ucsd" } });
    fireEvent.click(await screen.findByRole("option", { name: /UC San Diego/ }));

    const professorSearch = screen.getByLabelText("Professor search");
    fireEvent.change(professorSearch, {
      target: { value: "Taylor Northbridge" },
    });

    const createButton = await screen.findByRole("button", {
      name: 'Create new "Taylor Northbridge"',
    });
    fireEvent.click(createButton);

    expect(
      screen.getByRole("heading", { name: "Create new professor?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/at UC San Diego/)).toBeInTheDocument();
    expect(
      screen.queryByText(/New professor at UC San Diego/),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm create" }));

    expect(
      screen.getByText(/New professor at UC San Diego/),
    ).toBeInTheDocument();
  });

  it("shows a multi-file upload queue and requires a material type before upload", () => {
    render(
      <UploadDialog
        open
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
        courseId="course-cse101"
        courseLabel="CSE 101"
      />,
    );

    const fileInput = screen.getByLabelText("Select a file to upload");
    const files = [
      new File(["pdf-1"], "homework-1.pdf", { type: "application/pdf" }),
      new File(["pdf-2"], "homework-2.pdf", { type: "application/pdf" }),
      new File(["pdf-3"], "homework-3.pdf", { type: "application/pdf" }),
      new File(["ppt"], "lecture.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    ];

    fireEvent.change(fileInput, { target: { files } });

    for (const file of files) {
      expect(screen.getByText(file.name)).toBeInTheDocument();
    }
    expect(screen.getAllByText("queued")).toHaveLength(4);
    expect(screen.getByText("Select type")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload 4" })).toBeDisabled();
  });

  it("opens a PDF material preview from the materials list", () => {
    const material: StudyMaterialResponse = {
      id: "mat-cse101-midterm-review",
      fileName: "CSE101 Midterm Review.pdf",
      courseName: "Design and Analysis of Algorithms",
      courseId: "course-cse101",
      materialType: "EXAM",
      status: "READY",
      previewUrl: "/mock-materials/cse101-midterm-review.pdf",
      downloadUrl: "/mock-materials/cse101-midterm-review.pdf",
      contentType: "application/pdf",
      rejectionReason: null,
      createdAt: "2026-06-15T12:00:00.000Z",
    };

    function PreviewHarness() {
      const [previewTarget, setPreviewTarget] =
        useState<StudyMaterialResponse | null>(null);
      return (
        <>
          <MaterialList
            materials={[material]}
            loading={false}
            onPreview={setPreviewTarget}
          />
          <MaterialPreviewDialog
            material={previewTarget}
            open={previewTarget !== null}
            onOpenChange={(open) => {
              if (!open) setPreviewTarget(null);
            }}
          />
        </>
      );
    }

    render(<PreviewHarness />);

    fireEvent.click(
      screen.getByRole("button", { name: "Preview CSE101 Midterm Review.pdf" }),
    );

    expect(
      screen.getByRole("heading", { name: "CSE101 Midterm Review.pdf" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open file" }),
    ).toHaveAttribute("href", "/mock-materials/cse101-midterm-review.pdf");
    expect(
      screen.getByTitle("Preview CSE101 Midterm Review.pdf"),
    ).toHaveAttribute("src", "/mock-materials/cse101-midterm-review.pdf");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(
      screen.queryByTitle("Preview CSE101 Midterm Review.pdf"),
    ).not.toBeInTheDocument();
  });
});
