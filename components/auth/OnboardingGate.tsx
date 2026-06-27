"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { hasCompletedOnboarding } from "@/lib/onboarding-state";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setChecked(true);
      return;
    }

    if (!hasCompletedOnboarding(user.id)) {
      router.push("/onboarding");
      return;
    }

    setChecked(true);
  }, [isAuthenticated, router, user]);

  if (!checked) return null;

  return <>{children}</>;
}
