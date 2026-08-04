import { act, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersistedStudyGuidePanel } from "@/components/course/PersistedStudyGuidePanel";
import type {
  Course,
  StudyGuide,
  StudyGuideConcept,
  StudyGuideListItem,
  StudyGuideVersion,
  StudyGuideVersionMeta,
} from "@/types/api";

const { apiGet, apiPost, toastError } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
    post: apiPost,
    delete: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
  },
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
      aria-label="Guide select"
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

vi.mock("@/components/dashboard/DeleteDialog", () => ({
  DeleteDialog: () => null,
}));

const course: Course = {
  id: "course-1",
  code: "CSE 101",
  name: "Design and Analysis of Algorithms",
  schoolId: "school-1",
  professorId: "prof-1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function concept(id: string, title: string): StudyGuideConcept {
  return {
    id,
    logicalConceptId: id,
    title,
    category: "Concept",
    summary: `${title} summary`,
    contentOrigin: "generated",
    keyPoints: [`${title} key point`],
    sources: [],
  };
}

const currentVersion: StudyGuideVersion = {
  id: "version-current",
  guideId: "guide-1",
  versionNumber: 2,
  origin: "generated",
  baseVersionId: null,
  title: "Current guide",
  summary: "Current guide summary",
  concepts: [concept("concept-current", "Current concept")],
  createdAt: "2026-01-02T00:00:00.000Z",
};

const secondVersion: StudyGuideVersion = {
  id: "version-second",
  guideId: "guide-2",
  versionNumber: 1,
  origin: "generated",
  baseVersionId: null,
  title: "Final guide",
  summary: "Final guide summary",
  concepts: [concept("concept-second", "Final concept")],
  createdAt: "2026-01-03T00:00:00.000Z",
};

const historicalVersion: StudyGuideVersion = {
  id: "version-history",
  guideId: "guide-1",
  versionNumber: 1,
  origin: "generated",
  baseVersionId: null,
  title: "Historical guide",
  summary: "Historical guide summary",
  concepts: [concept("concept-history", "Historical concept")],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const guide: StudyGuide = {
  id: "guide-1",
  courseId: course.id,
  target: "Midterm 1",
  retrievalMode: "personal",
  status: "generating",
  errorCode: null,
  errorMessage: null,
  currentVersionId: currentVersion.id,
  currentVersion,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  readyAt: null,
};

const readyVersion: StudyGuideVersion = {
  id: "version-ready",
  guideId: "guide-1",
  versionNumber: 3,
  origin: "generated",
  baseVersionId: currentVersion.id,
  title: "Ready guide",
  summary: "Ready guide summary",
  concepts: [concept("concept-ready", "Ready concept")],
  createdAt: "2026-01-04T00:00:00.000Z",
};

const readyGuide: StudyGuide = {
  ...guide,
  status: "ready",
  currentVersionId: readyVersion.id,
  currentVersion: readyVersion,
  updatedAt: "2026-01-04T00:00:00.000Z",
  readyAt: "2026-01-04T00:00:00.000Z",
};

const secondGuide: StudyGuide = {
  id: "guide-2",
  courseId: course.id,
  target: "Final",
  retrievalMode: "personal",
  status: "generating",
  errorCode: null,
  errorMessage: null,
  currentVersionId: secondVersion.id,
  currentVersion: secondVersion,
  createdAt: "2026-01-03T00:00:00.000Z",
  updatedAt: "2026-01-03T00:00:00.000Z",
  readyAt: null,
};

const guideListItem: StudyGuideListItem = {
  id: "guide-1",
  courseId: course.id,
  target: "Midterm 1",
  retrievalMode: "personal",
  status: "generating",
  currentVersionId: currentVersion.id,
  title: currentVersion.title,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  readyAt: null,
};

const secondGuideListItem: StudyGuideListItem = {
  id: "guide-2",
  courseId: course.id,
  target: "Final",
  retrievalMode: "personal",
  status: "generating",
  currentVersionId: secondVersion.id,
  title: secondVersion.title,
  createdAt: "2026-01-03T00:00:00.000Z",
  updatedAt: "2026-01-03T00:00:00.000Z",
  readyAt: null,
};

const versionMetas: StudyGuideVersionMeta[] = [
  {
    id: currentVersion.id,
    guideId: "guide-1",
    versionNumber: 2,
    origin: "generated",
    baseVersionId: null,
    createdAt: currentVersion.createdAt,
  },
  {
    id: historicalVersion.id,
    guideId: "guide-1",
    versionNumber: 1,
    origin: "generated",
    baseVersionId: null,
    createdAt: historicalVersion.createdAt,
  },
];

const readyVersionMetas: StudyGuideVersionMeta[] = [
  {
    id: readyVersion.id,
    guideId: "guide-1",
    versionNumber: 3,
    origin: "generated",
    baseVersionId: currentVersion.id,
    createdAt: readyVersion.createdAt,
  },
  ...versionMetas,
];

const secondVersionMetas: StudyGuideVersionMeta[] = [
  {
    id: secondVersion.id,
    guideId: "guide-2",
    versionNumber: 1,
    origin: "generated",
    baseVersionId: null,
    createdAt: secondVersion.createdAt,
  },
];

function mockStudyGuideApi(
  options: {
    includeSecondGuide?: boolean;
    guideSequence?: StudyGuide[];
    versionsSequence?: StudyGuideVersionMeta[][];
  } = {},
) {
  let guideCallIndex = 0;
  let versionsCallIndex = 0;
  apiGet.mockImplementation(async (endpoint: string) => {
    if (endpoint === `/api/courses/${course.id}/study-guides`) {
      return options.includeSecondGuide
        ? [guideListItem, secondGuideListItem]
        : [guideListItem];
    }
    if (endpoint === "/api/study-guides/guide-1") {
      const sequence = options.guideSequence ?? [guide];
      const response = sequence[Math.min(guideCallIndex, sequence.length - 1)];
      guideCallIndex += 1;
      return response;
    }
    if (endpoint === "/api/study-guides/guide-2") return secondGuide;
    if (endpoint === "/api/study-guides/guide-1/versions") {
      const sequence = options.versionsSequence ?? [versionMetas];
      const response = sequence[Math.min(versionsCallIndex, sequence.length - 1)];
      versionsCallIndex += 1;
      return response;
    }
    if (endpoint === "/api/study-guides/guide-2/versions") return secondVersionMetas;
    if (endpoint === "/api/study-guides/guide-1/versions/version-history") {
      return historicalVersion;
    }
    if (endpoint === "/api/syllabus-events") return [];
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
  apiPost.mockResolvedValue({
    guideId: "guide-2",
    courseId: course.id,
    target: "Final",
    retrievalMode: "personal",
    status: "queued",
    createdAt: "2026-01-03T00:00:00.000Z",
  });
}

async function flushAsyncUpdates() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function guideFetchCount(guideId: string) {
  return apiGet.mock.calls.filter(([endpoint]) => endpoint === `/api/study-guides/${guideId}`)
    .length;
}

describe("PersistedStudyGuidePanel polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiGet.mockReset();
    apiPost.mockReset();
    toastError.mockReset();
    mockStudyGuideApi();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not reset the historical version view on status polling", async () => {
    render(<PersistedStudyGuidePanel course={course} />);

    await flushAsyncUpdates();
    expect(screen.getByText("Current concept")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Version 1 · generated"));
    await flushAsyncUpdates();
    expect(screen.getByText("Historical concept")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(screen.getByText("Historical concept")).toBeInTheDocument();
    expect(screen.queryByText("Current concept")).not.toBeInTheDocument();
  });

  it("stops automatic polling, but keeps manual refresh available", async () => {
    render(<PersistedStudyGuidePanel course={course} />);

    await flushAsyncUpdates();
    expect(screen.getByText("Generating from course materials")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(91 * 2500);
    });
    await flushAsyncUpdates();

    expect(
      screen.getByText(
        "Automatic refresh paused after several attempts. Use Refresh status to check again.",
      ),
    ).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith(
      "Study guide generation is taking longer than expected.",
    );

    const countAfterTimeout = guideFetchCount("guide-1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 2500);
    });
    await flushAsyncUpdates();
    expect(guideFetchCount("guide-1")).toBe(countAfterTimeout);

    fireEvent.click(screen.getByRole("button", { name: /Refresh status/i }));
    await flushAsyncUpdates();
    expect(guideFetchCount("guide-1")).toBe(countAfterTimeout + 1);
  });

  it("resets the polling counter for a newly generated guide", async () => {
    mockStudyGuideApi({ includeSecondGuide: true });
    render(<PersistedStudyGuidePanel course={course} />);

    await flushAsyncUpdates();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(91 * 2500);
    });
    await flushAsyncUpdates();
    const firstGuideCountAfterTimeout = guideFetchCount("guide-1");

    fireEvent.change(screen.getByPlaceholderText("Target, e.g. Midterm 1"), {
      target: { value: "Final" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Generate$/i }));
    await flushAsyncUpdates();

    expect(apiPost).toHaveBeenCalledWith(
      `/api/courses/${course.id}/study-guides`,
      { target: "Final", retrievalMode: "personal" },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(screen.getByText("Final concept")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    await flushAsyncUpdates();

    expect(guideFetchCount("guide-2")).toBeGreaterThan(1);
    expect(guideFetchCount("guide-1")).toBe(firstGuideCountAfterTimeout);
  });

  it("does not carry the old guide timer or counter into a different selected guide", async () => {
    mockStudyGuideApi({ includeSecondGuide: true });
    render(<PersistedStudyGuidePanel course={course} />);

    await flushAsyncUpdates();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(91 * 2500);
    });
    await flushAsyncUpdates();
    const firstGuideCountAfterTimeout = guideFetchCount("guide-1");

    fireEvent.click(screen.getByTitle("Final guide — generating · personal"));
    await flushAsyncUpdates();
    expect(screen.getByText("Final concept")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    await flushAsyncUpdates();

    expect(guideFetchCount("guide-2")).toBeGreaterThan(1);
    expect(guideFetchCount("guide-1")).toBe(firstGuideCountAfterTimeout);
  });

  it("automatically shows the latest version when generation becomes ready with no active interaction", async () => {
    mockStudyGuideApi({
      guideSequence: [guide, readyGuide],
      versionsSequence: [versionMetas, readyVersionMetas],
    });
    render(<PersistedStudyGuidePanel course={course} />);

    await flushAsyncUpdates();
    expect(screen.getByText("Current concept")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    await flushAsyncUpdates();

    expect(screen.getByText("Ready concept")).toBeInTheDocument();
    expect(screen.queryByText("New version available")).not.toBeInTheDocument();
  });

  it("preserves active historical view and shows a new-version prompt when generation becomes ready", async () => {
    mockStudyGuideApi({
      guideSequence: [guide, readyGuide],
      versionsSequence: [versionMetas, readyVersionMetas],
    });
    render(<PersistedStudyGuidePanel course={course} />);

    await flushAsyncUpdates();
    fireEvent.click(screen.getByTitle("Version 1 · generated"));
    await flushAsyncUpdates();
    expect(screen.getByText("Historical concept")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    await flushAsyncUpdates();

    expect(screen.getByText("Historical concept")).toBeInTheDocument();
    expect(screen.queryByText("Ready concept")).not.toBeInTheDocument();
    expect(screen.getByText("New version available")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View latest" }));

    expect(screen.getByText("Ready concept")).toBeInTheDocument();
    expect(screen.queryByText("Historical concept")).not.toBeInTheDocument();
    expect(screen.queryByText("New version available")).not.toBeInTheDocument();
  });
});
