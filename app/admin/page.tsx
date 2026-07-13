"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { apiClient } from "@/lib/api-client";
import type { ApiError } from "@/types/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface FlaggedAnswer {
  id: string;
  rating: string | null;
  reported: boolean;
  reason: string | null;
  createdAt: string;
  answer: string;
  mode: string | null;
  verified: boolean;
  courseName: string;
}

type State = "loading" | "ok" | "forbidden" | "error";

export default function AdminReviewPage() {
  const [items, setItems] = useState<FlaggedAnswer[]>([]);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    apiClient
      .get<FlaggedAnswer[]>("/api/admin/feedback")
      .then((data) => {
        setItems(data);
        setState("ok");
      })
      .catch((e) => setState((e as ApiError)?.status === 403 ? "forbidden" : "error"));
  }, []);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Answer Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reported and down-voted answers, newest first.
        </p>

        {state === "loading" && (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        )}
        {state === "forbidden" && (
          <p className="mt-6 text-sm text-destructive">
            Not authorized — admin access only.
          </p>
        )}
        {state === "error" && (
          <p className="mt-6 text-sm text-destructive">
            Couldn&apos;t load the review queue.
          </p>
        )}
        {state === "ok" && items.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            No flagged answers right now. 🎉
          </p>
        )}

        {state === "ok" && items.length > 0 && (
          <div className="mt-6 space-y-3">
            {items.map((it) => (
              <Card key={it.id} className="rounded-xl">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {it.reported && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">
                        reported
                      </span>
                    )}
                    {it.rating === "down" && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">
                        👎 down-voted
                      </span>
                    )}
                    {it.mode && (
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-700">
                        {it.mode}
                      </span>
                    )}
                    {it.verified && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
                        ✓ checked
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {it.courseName || "—"} · {new Date(it.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {it.reason && (
                    <p className="mt-1 text-sm text-amber-800">“{it.reason}”</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-6 whitespace-pre-wrap text-sm text-neutral-700">
                    {it.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
