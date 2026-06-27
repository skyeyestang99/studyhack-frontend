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

const { apiGet } = vi.hoisted(() => ({
  apiGet: vi.fn((endpoint: string) => {
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
    return Promise.resolve([]);
  }),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
  },
}));

const UNKNOWN_SCHOOL_NAME = "Northbridge Demo University";

describe("student workspace flows", () => {
  beforeEach(() => {
    apiGet.mockClear();
  });

  it("lets a student create a school when search has no matching result", async () => {
    render(<OnboardingPage />);

    const searchInput = await screen.findByPlaceholderText(
      "Search school or type a new one",
    );
    fireEvent.change(searchInput, {
      target: { value: UNKNOWN_SCHOOL_NAME },
    });

    expect(
      screen.getByText(`No school found for "${UNKNOWN_SCHOOL_NAME}".`),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create new school" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("School name")).toHaveValue(
        UNKNOWN_SCHOOL_NAME,
      );
    });
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
