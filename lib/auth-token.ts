import { env } from "@/lib/env";

type ClerkGlobal = {
  loaded?: boolean;
  session?: { getToken?: () => Promise<string | null> };
};

const getClerk = (): ClerkGlobal | undefined =>
  (window as unknown as { Clerk?: ClerkGlobal }).Clerk;

/** Wait (briefly) for Clerk to finish loading so early calls attach a token
 * instead of racing to a 401 (A3). */
async function waitForClerk(timeoutMs = 3000): Promise<ClerkGlobal | undefined> {
  const start = Date.now();
  let clerk = getClerk();
  while ((!clerk || !clerk.loaded) && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 50));
    clerk = getClerk();
  }
  return clerk;
}

/**
 * Fetch a fresh Clerk session token for backend calls from non-hook contexts
 * (api-client, multipart upload, SSE streaming). Returns null when signed out.
 * In mock mode we return a placeholder so the UI works without a backend.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (env.useMocks) return "mock-token";
  try {
    const clerk = await waitForClerk();
    return (await clerk?.session?.getToken?.()) ?? null;
  } catch {
    return null;
  }
}
