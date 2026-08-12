import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { OnboardingGate } from "@/components/auth/OnboardingGate";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

/**
 * The signed-in shell: auth gate, onboarding gate, sidebar, scrollable content.
 *
 * Dashboard and courses had this markup duplicated, and settings/admin had none —
 * they relied on the marketing nav that used to come from the root layout, so
 * removing it would have left them with no way to navigate out.
 *
 * The height chain matters: the (app) layout owns the viewport with h-dvh, this
 * fills it with h-full, and `min-h-0` lets the flex child shrink so the inner
 * `overflow-y-auto` actually scrolls instead of the whole page growing.
 */
export function AppSidebarShell({
  children,
  padded = true,
}: {
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <ProtectedRoute>
      <OnboardingGate>
        <div className="flex h-full min-h-0 flex-col bg-background md:flex-row">
          <DashboardSidebar />
          <main
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${padded ? "p-6" : ""}`}
          >
            {children}
          </main>
        </div>
      </OnboardingGate>
    </ProtectedRoute>
  );
}
