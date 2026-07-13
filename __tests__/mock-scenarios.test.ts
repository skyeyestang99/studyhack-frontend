import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    apiUrl: "http://localhost:8080",
    useMocks: true,
    mockScenario: "default" as
      | "default"
      | "empty-courses"
      | "loading"
      | "error",
    mockDelayMs: 0,
  },
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

import { apiClient } from "@/lib/api-client";
import { mockCourses } from "@/lib/mock-data";
import type { Course } from "@/types/api";

describe("mock API scenarios", () => {
  beforeEach(() => {
    mockEnv.useMocks = true;
    mockEnv.mockScenario = "default";
    mockEnv.mockDelayMs = 0;
    vi.restoreAllMocks();
  });

  it("returns the seeded courses in the default scenario", async () => {
    await expect(apiClient.get<Course[]>("/api/courses")).resolves.toEqual(
      mockCourses,
    );
  });

  it("returns no courses in the empty-courses scenario", async () => {
    mockEnv.mockScenario = "empty-courses";

    await expect(apiClient.get<Course[]>("/api/courses")).resolves.toEqual([]);
  });

  it("delays mock responses so loading states can be inspected", async () => {
    vi.useFakeTimers();
    mockEnv.mockScenario = "loading";
    mockEnv.mockDelayMs = 1_500;
    let settled = false;

    const request = apiClient
      .get<Course[]>("/api/courses")
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(1_499);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toEqual(mockCourses);
    vi.useRealTimers();
  });

  it("returns a deterministic API error without calling the backend", async () => {
    mockEnv.mockScenario = "error";
    const fetchSpy = vi.spyOn(global, "fetch");

    await expect(apiClient.get("/api/courses")).rejects.toMatchObject({
      status: 503,
      error: "Mock Service Unavailable",
      path: "/api/courses",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not fall back to mock data when a real backend request fails", async () => {
    mockEnv.useMocks = false;
    vi.spyOn(global, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      apiClient.get<Course[]>("/api/courses"),
    ).rejects.toMatchObject({
      status: 0,
      error: "Network Error",
      message: "Unable to connect to server",
      path: "/api/courses",
    });
  });
});
