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

  it("loads a PDF with auth and renders the blob preview URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["pdf"], { type: "application/pdf" }), {
        status: 200,
      }),
    );
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
        material={pdfMaterial}
        open
        onOpenChange={onOpenChange}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "CSE101 Midterm Review.pdf" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Open file" }))
      .toHaveAttribute("href", "blob:material-preview");
    expect(screen.getByTitle("Preview CSE101 Midterm Review.pdf"))
      .toHaveAttribute("src", "blob:material-preview");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/mock-materials/cse101-midterm-review.pdf",
      { headers: { Authorization: "Bearer mock-token" } },
    );
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Object));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    unmount();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:material-preview");
  });
});
