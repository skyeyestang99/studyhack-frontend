"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntities } from "@/hooks/useEntities";
import type { Course } from "@/types/api";

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
  const { data: courses } = useEntities<Course>("/api/courses");

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
      <aside className="hidden w-56 shrink-0 border-r bg-muted/40 md:block">
        <nav
          className="flex flex-col gap-1 p-4"
          aria-label="Dashboard navigation"
        >
          {sidebarLinks.map((link) => (
            <div key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.icon}
                {link.label}
              </Link>
              {link.href === "/dashboard/courses" && courses.length > 0 && (
                <div className="mt-1 space-y-1 pl-7">
                  {courses.map((course) => {
                    const href = `/courses/${course.id}`;
                    const courseActive = pathname.startsWith(href);
                    return (
                      <Link
                        key={course.id}
                        href={href}
                        className={cn(
                          "block truncate rounded-md px-3 py-1.5 text-sm transition-colors",
                          courseActive
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                        title={`${course.code} — ${course.name}`}
                      >
                        {course.code}
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
        className="flex gap-1 overflow-x-auto border-b bg-muted/40 px-4 py-2 md:hidden"
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
