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
import { env } from "@/lib/env";

type HealthState =
  | { kind: "loading" }
  | { kind: "success"; data: HealthCheckResponse }
  | { kind: "error"; message: string };

/**
 * Backend health check.
 *
 * This used to be the landing page's main content, so the first thing an invitee
 * saw could be "Unable to connect to the backend." It is genuinely useful for
 * checking a deploy, just not as a value proposition — so it lives here instead.
 */
export default function DebugPage() {
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });

  const fetchHealth = useCallback(async () => {
    setHealth({ kind: "loading" });
    try {
      const data = await apiClient.get<HealthCheckResponse>("/api/health");
      setHealth({ kind: "success", data });
    } catch {
      setHealth({
        kind: "error",
        message: "Unable to connect to the backend.",
      });
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>
            Backend health for <span className="font-mono">{env.appEnv}</span>
          </CardDescription>
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
                      ? "bg-grounded/15 text-grounded-foreground"
                      : "bg-destructive/15 text-destructive"
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
                      ? "text-grounded"
                      : "text-destructive"
                  }`}
                >
                  {health.data.database ?? "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API URL</span>
                <span className="max-w-[60%] truncate font-mono text-xs text-muted-foreground">
                  {env.apiUrl}
                </span>
              </div>
            </div>
          )}

          {health.kind === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{health.message}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchHealth()}>
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
