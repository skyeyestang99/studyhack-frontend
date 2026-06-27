"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { HealthCheckResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type HealthState =
  | { kind: "loading" }
  | { kind: "success"; data: HealthCheckResponse }
  | { kind: "error"; message: string };

export default function Home() {
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });

  const fetchHealth = useCallback(async () => {
    setHealth({ kind: "loading" });
    try {
      const data = await apiClient.get<HealthCheckResponse>("/api/health");
      setHealth({ kind: "success", data });
    } catch {
      setHealth({
        kind: "error",
        message: "Unable to connect to the backend. Please try again later.",
      });
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="flex flex-col items-center px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          AI-Powered Homework Guidance
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          StudyAI helps college students learn smarter with personalized,
          AI-driven homework assistance. Get step-by-step guidance tailored to
          your courses, professors, and learning style.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </section>

      {/* Health Check Card */}
      <section className="mx-auto mt-16 w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Backend service health check</CardDescription>
          </CardHeader>
          <CardContent>
            {health.kind === "loading" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  role="status"
                />
                <span>Checking status…</span>
              </div>
            )}

            {health.kind === "success" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      health.data.status === "UP"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {health.data.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database</span>
                  <span
                    className={`text-sm ${
                      health.data.database === "connected"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {health.data.database}
                  </span>
                </div>
              </div>
            )}

            {health.kind === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-red-600">{health.message}</p>
                <Button variant="outline" size="sm" onClick={fetchHealth}>
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
