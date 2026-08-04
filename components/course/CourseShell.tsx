"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Home,
  MessageCircleQuestion,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Course, Professor, School } from "@/types/api";

interface CourseShellProps {
  course: Course;
  school?: School;
  professor?: Professor;
  children: React.ReactNode;
}

const navItems = [
  { label: "Home", href: "", icon: Home },
  { label: "Materials", href: "/materials", icon: FileText },
  { label: "Chat", href: "/chat", icon: MessageCircleQuestion },
  { label: "Study Guide", href: "/study-guide", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CourseShell({
  course,
  children,
}: CourseShellProps) {
  const pathname = usePathname();
  const baseHref = `/courses/${course.id}`;
  const isStudyGuide = pathname.startsWith(`${baseHref}/study-guide`);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isStudyGuide);

  useEffect(() => {
    if (isStudyGuide) setSidebarCollapsed(true);
  }, [isStudyGuide]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex w-full flex-1 flex-col md:flex-row">
        <aside
          className={cn(
            "border-b border-border bg-background transition-[width] duration-200 md:border-b-0",
            sidebarCollapsed ? "md:w-14" : "md:w-48",
          )}
        >
          <div
            className={cn(
              "hidden h-11 items-center border-b border-border md:flex",
              sidebarCollapsed ? "justify-center" : "justify-end px-5",
            )}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
          <nav
            className={cn(
              "flex gap-2 overflow-x-auto px-4 py-3 md:flex-col md:overflow-visible",
              sidebarCollapsed ? "md:px-1 md:py-3" : "md:px-4 md:py-7",
            )}
            aria-label="Course navigation"
          >
            {navItems.map((item) => {
              const href = `${baseHref}${item.href}`;
              const isActive =
                item.href === ""
                  ? pathname === baseHref
                  : pathname.startsWith(href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "flex min-w-0 shrink-0 items-center gap-3 rounded-lg text-base font-semibold transition-colors",
                    sidebarCollapsed
                      ? "justify-center px-0 py-3 md:w-12"
                      : "px-3 py-3",
                    isActive
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm",
                  )}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main
          className={cn(
            "min-w-0 flex-1 overflow-auto",
            isStudyGuide ? "p-0" : "px-4 py-5 md:px-8 md:py-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
