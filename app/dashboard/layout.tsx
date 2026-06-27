import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { OnboardingGate } from "@/components/auth/OnboardingGate";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <OnboardingGate>
        <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row">
          <DashboardSidebar />
          <main className="flex-1 overflow-hidden p-6">{children}</main>
        </div>
      </OnboardingGate>
    </ProtectedRoute>
  );
}
