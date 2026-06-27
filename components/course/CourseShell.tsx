"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  Home,
  MessageCircleQuestion,
  Sparkles,
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
];

export function CourseShell({
  course,
  school,
  professor,
  children,
}: CourseShellProps) {
  const pathname = usePathname();
  const baseHref = `/courses/${course.id}`;

  return (
    <div className="flex min-h-full flex-col bg-[#fafafa]">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <BookOpen className="h-3.5 w-3.5" />
                {course.code}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
                {course.name}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {school?.name ?? "School"} ·{" "}
                {professor?.name ? `Professor ${professor.name}` : "Professor"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        <aside className="border-b bg-transparent md:w-60 md:border-b-0 md:py-6">
          <nav
            className="flex gap-2 overflow-x-auto px-4 py-3 md:flex-col md:overflow-visible md:px-4 md:py-0"
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
                    "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto px-4 py-5 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
