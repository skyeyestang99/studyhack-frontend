"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import type { Course } from "@/types/api";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/lib/onboarding-state";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isAuthenticated, user } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated || !user) {
      setChecked(true);
      return;
    }

    // Fast path: already marked complete on this device.
    if (hasCompletedOnboarding(user.id)) {
      setChecked(true);
      return;
    }

    // Otherwise derive from the server: an enrolled student on a new device /
    // cleared storage should NOT be forced back through onboarding (A2).
    let cancelled = false;
    (async () => {
      try {
        const courses = await apiClient.get<Course[]>("/api/courses");
        if (cancelled) return;
        if (Array.isArray(courses) && courses.length > 0) {
          markOnboardingComplete(user.id);
          setChecked(true);
          return;
        }
      } catch {
        // On error, fall through to onboarding rather than trapping the user.
      }
      if (!cancelled) router.push("/onboarding");
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isAuthenticated, router, user]);

  if (!checked) return null;

  return <>{children}</>;
}
