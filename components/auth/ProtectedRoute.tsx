"use client";

import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/lib/env";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (env.useMocks) return;
    if (isLoaded && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoaded, isAuthenticated, router]);

  if (env.useMocks) return <>{children}</>;
  if (!isLoaded || !isAuthenticated) return null;

  return <>{children}</>;
}
