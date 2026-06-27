const ONBOARDING_PREFIX = "studyai:onboarding-complete";

function keyForUser(userId?: string | null) {
  return userId ? `${ONBOARDING_PREFIX}:${userId}` : ONBOARDING_PREFIX;
}

export function hasCompletedOnboarding(userId?: string | null) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(keyForUser(userId)) === "true";
}

export function markOnboardingComplete(userId?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyForUser(userId), "true");
}

export function getPostLoginPath(userId?: string | null) {
  return hasCompletedOnboarding(userId) ? "/dashboard" : "/onboarding";
}
