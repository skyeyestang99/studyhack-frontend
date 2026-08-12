import { AppSidebarShell } from "@/components/layout/AppSidebarShell";

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return <AppSidebarShell padded={false}>{children}</AppSidebarShell>;
}
