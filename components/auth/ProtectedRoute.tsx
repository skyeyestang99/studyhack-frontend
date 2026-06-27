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
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !env.useMocks) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated && !env.useMocks) {
    return null;
  }

  return <>{children}</>;
}
