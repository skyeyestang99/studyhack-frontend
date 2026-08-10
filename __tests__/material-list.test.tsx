import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaterialList } from "@/components/dashboard/MaterialList";
import type { StudyMaterialResponse } from "@/types/api";

const failedMaterial: StudyMaterialResponse = {
  id: "material-1",
  fileName: "lecture.pdf",
  courseName: "CSE 101",
  courseId: "course-1",
  materialType: "PPT",
  status: "FAILED",
  previewUrl: null,
  downloadUrl: null,
  contentType: "application/pdf",
  rejectionReason: null,
  embeddingError: "OPENAI_API_KEY is required for material embeddings.",
  embeddingAttempts: 1,
  lastAttemptedAt: "2026-08-04T02:40:00.000Z",
  createdAt: "2026-08-04T02:30:00.000Z",
};

describe("MaterialList", () => {
  it("shows failed material details and exposes retry", () => {
    const onRetry = vi.fn();

    render(
      <MaterialList
        materials={[failedMaterial]}
        loading={false}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByText("lecture.pdf"));

    expect(screen.getByText(/Processing failed:/)).toBeInTheDocument();
    expect(
      screen.getByText(/OPENAI_API_KEY is required/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry lecture.pdf" }));

    expect(onRetry).toHaveBeenCalledWith(failedMaterial);
  });
});
