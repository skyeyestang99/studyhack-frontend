import { env } from "@/lib/env";

type ClerkGlobal = {
  session?: { getToken?: () => Promise<string | null> };
};

/**
 * Fetch a fresh Clerk session token for backend calls from non-hook contexts
 * (api-client, multipart upload, SSE streaming). Returns null when signed out.
 * In mock mode we return a placeholder so the UI works without a backend.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (env.useMocks) return "mock-token";
  try {
    const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
    return (await clerk?.session?.getToken?.()) ?? null;
  } catch {
    return null;
  }
}
