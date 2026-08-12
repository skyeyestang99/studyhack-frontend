import ProtectedRoute from "@/components/auth/ProtectedRoute";

/**
 * Onboarding is deliberately chrome-free: no sidebar (there is nothing to
 * navigate to yet) and no OnboardingGate, which would redirect this page to
 * itself. It owns its own scrolling because the (app) shell is overflow-hidden.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="h-full min-h-0 overflow-y-auto">{children}</div>
    </ProtectedRoute>
  );
}
