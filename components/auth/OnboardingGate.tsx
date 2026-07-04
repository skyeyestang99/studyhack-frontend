"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { hasCompletedOnboarding } from "@/lib/onboarding-state";

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

    if (!hasCompletedOnboarding(user.id)) {
      router.push("/onboarding");
      return;
    }

    setChecked(true);
  }, [isLoaded, isAuthenticated, router, user]);

  if (!checked) return null;

  return <>{children}</>;
}
