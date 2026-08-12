import { AppSidebarShell } from "@/components/layout/AppSidebarShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppSidebarShell>{children}</AppSidebarShell>;
}
