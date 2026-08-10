import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MaterialPreviewDialog } from "@/components/dashboard/MaterialPreviewDialog";
import type { StudyMaterialResponse } from "@/types/api";

vi.mock("@/lib/env", () => ({
  env: {
    apiUrl: "http://localhost:8080",
    useMocks: true,
  },
}));

const pdfMaterial: StudyMaterialResponse = {
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

describe("MaterialPreviewDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a presigned PDF URL directly without auth fetch", async () => {
    const presignedMaterial = {
      ...pdfMaterial,
      previewUrl: "https://r2.example.com/signed-preview",
      downloadUrl: "https://r2.example.com/signed-preview",
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const createObjectUrl = vi.fn(() => "blob:material-preview");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });

    const onOpenChange = vi.fn();
    const { unmount } = render(
      <MaterialPreviewDialog
        material={presignedMaterial}
        open
        onOpenChange={onOpenChange}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "CSE101 Midterm Review.pdf" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open file" }))
      .toHaveAttribute("href", "https://r2.example.com/signed-preview");
    expect(screen.getByTitle("Preview CSE101 Midterm Review.pdf"))
      .toHaveAttribute("src", "https://r2.example.com/signed-preview");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(createObjectUrl).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    unmount();
    expect(revokeObjectUrl).not.toHaveBeenCalled();
  });

  it("keeps auth for backend preview URLs", async () => {
    const backendMaterial = {
      ...pdfMaterial,
      previewUrl: "http://localhost:8080/api/materials/mat-1/preview-file",
      downloadUrl: "http://localhost:8080/api/materials/mat-1/preview-file",
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["pdf"], { type: "application/pdf" }), {
        status: 200,
      }),
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:material-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });

    render(
      <MaterialPreviewDialog
        material={backendMaterial}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(await screen.findByRole("link", { name: "Open file" }))
      .toHaveAttribute("href", "blob:material-preview");
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8080/api/materials/mat-1/preview-file",
      { headers: { Authorization: "Bearer mock-token" } },
    );
  });
});
