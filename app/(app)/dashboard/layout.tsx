import { AppSidebarShell } from "@/components/layout/AppSidebarShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppSidebarShell>{children}</AppSidebarShell>;
}
