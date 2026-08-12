import { AppSidebarShell } from "@/components/layout/AppSidebarShell";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AppSidebarShell>{children}</AppSidebarShell>;
}
