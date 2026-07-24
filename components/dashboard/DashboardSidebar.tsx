"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntities } from "@/hooks/useEntities";
import type { Course, Professor, School } from "@/types/api";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const sidebarLinks: SidebarLink[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/dashboard/courses",
    label: "Courses",
    icon: <BookOpen className="h-4 w-4" />,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const isCourseWorkspace = pathname.startsWith("/courses");
  const isStudyGuide = /\/courses\/[^/]+\/study-guide/.test(pathname);
  const [collapsed, setCollapsed] = useState(isCourseWorkspace);
  const { data: courses } = useEntities<Course>("/api/courses");
  const { data: schools } = useEntities<School>("/api/schools");
  const { data: professors } = useEntities<Professor>("/api/professors");

  useEffect(() => {
    if (isCourseWorkspace || isStudyGuide) {
      setCollapsed(true);
    }
  }, [isCourseWorkspace, isStudyGuide, pathname]);

  // Disambiguate look-alike codes (e.g. two "CSE 101" at different schools) by
  // showing the school and professor. Falls back to the course name.
  const courseSubtitle = (course: Course) =>
    [
      schools.find((s) => s.id === course.schoolId)?.name,
      professors.find((p) => p.id === course.professorId)?.name,
    ]
      .filter(Boolean)
      .join(" · ") || course.name;

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/dashboard/courses") {
      return pathname.startsWith("/dashboard/courses") || pathname.startsWith("/courses");
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-background transition-[width] duration-200 md:block",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <div className={cn("flex h-11 items-center border-b border-border", collapsed ? "justify-center" : "justify-end px-4")}>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav
          className={cn("flex flex-col gap-1", collapsed ? "p-2" : "p-5")}
          aria-label="Dashboard navigation"
        >
          {sidebarLinks.map((link) => (
            <div key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-lg text-base font-semibold transition-colors",
                  collapsed ? "justify-center px-0 py-3" : "px-3 py-3",
                  isActive(link.href)
                    ? "bg-neutral-950 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm",
                )}
                title={link.label}
              >
                <span className="shrink-0">{link.icon}</span>
                {!collapsed && <span className="truncate">{link.label}</span>}
              </Link>
              {!collapsed && link.href === "/dashboard/courses" && courses.length > 0 && (
                <div className="mt-2 space-y-1 pl-6">
                  {courses.map((course) => {
                    const href = `/courses/${course.id}`;
                    const courseActive = pathname.startsWith(href);
                    return (
                      <Link
                        key={course.id}
                        href={href}
                        className={cn(
                          "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                          courseActive
                            ? "bg-neutral-950 font-semibold text-white shadow-sm"
                            : "text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm",
                        )}
                        title={`${course.code} — ${course.name} (${courseSubtitle(course)})`}
                      >
                        <span className="block truncate">{course.code}</span>
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-xs",
                            courseActive ? "text-white/70" : "text-muted-foreground",
                          )}
                        >
                          {courseSubtitle(course)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile horizontal nav */}
      <nav
        className="flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2 md:hidden"
        aria-label="Dashboard navigation"
      >
        {sidebarLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive(link.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
        {courses.map((course) => {
          const href = `/courses/${course.id}`;
          return (
            <Link
              key={course.id}
              href={href}
              className={cn(
                "flex shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {course.code}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
