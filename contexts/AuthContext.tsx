"use client";

import { ReactNode } from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { env } from "@/lib/env";
import { mockUser } from "@/lib/mock-data";
import { UserProfile } from "@/types/api";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoaded: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}

/**
 * Pass-through now that Clerk's <ClerkProvider> (see app/layout.tsx) owns auth
 * state. Kept so existing imports of AuthProvider keep working.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Same surface as the old custom context, backed by Clerk so the many existing
 * consumers don't change. Backend calls get their token via lib/auth-token.
 */
export function useAuth(): AuthState {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { isLoaded: authLoaded, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();

  // Mock mode: let the UI run without signing in (intern/dev workflow).
  if (env.useMocks && !isSignedIn) {
    return {
      user: mockUser,
      token: "mock-token",
      isAuthenticated: true,
      isLoaded: true,
      login: () => {},
      logout: () => {},
    };
  }

  const user: UserProfile | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
        name: clerkUser.fullName ?? clerkUser.firstName ?? "",
        subscriptionTier: "FREE",
      }
    : null;

  return {
    user,
    token: null,
    isAuthenticated: Boolean(isSignedIn),
    isLoaded: userLoaded && authLoaded,
    login: () => {},
    logout: () => void signOut({ redirectUrl: "/" }),
  };
}
