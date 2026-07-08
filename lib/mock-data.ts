import type {
  ChatMessage,
  Conversation,
  Course,
  Professor,
  School,
  StudyMaterialResponse,
  UserProfile,
} from "@/types/api";
import type { MockScenario } from "@/lib/env";

export interface SyllabusEvent {
  id: string;
  courseId: string;
  title: string;
  type: "HOMEWORK" | "MIDTERM" | "FINAL" | "READING" | "OTHER";
  dueAt: string;
  sourceMaterialId?: string;
}

export const mockUser: UserProfile = {
  id: "mock-user",
  email: "student@example.edu",
  name: "Demo Student",
  subscriptionTier: "FREE",
};

export const mockSchools: School[] = [
  {
    id: "school-ucsd",
    name: "UC San Diego",
    shortName: "UC San Diego",
    aliases: ["UCSD", "University of California San Diego"],
    location: "La Jolla, CA",
    createdAt: "2026-01-05T08:00:00.000Z",
  },
  {
    id: "school-ucla",
    name: "UCLA",
    shortName: "UCLA",
    aliases: ["University of California Los Angeles"],
    location: "Los Angeles, CA",
    createdAt: "2026-01-05T08:00:00.000Z",
  },
];

export const mockProfessors: Professor[] = [
  {
    id: "prof-smith",
    name: "Dana Smith",
    department: "Computer Science",
    schoolId: "school-ucsd",
    createdAt: "2026-01-06T08:00:00.000Z",
  },
  {
    id: "prof-lee",
    name: "Morgan Lee",
    department: "Mathematics",
    schoolId: "school-ucsd",
    createdAt: "2026-01-06T08:00:00.000Z",
  },
];

export const mockCourses: Course[] = [
  {
    id: "course-cse101",
    name: "Design and Analysis of Algorithms",
    code: "CSE 101",
    schoolId: "school-ucsd",
    professorId: "prof-smith",
    createdAt: "2026-01-08T08:00:00.000Z",
  },
  {
    id: "course-math20d",
    name: "Differential Equations",
    code: "MATH 20D",
    schoolId: "school-ucsd",
    professorId: "prof-lee",
    createdAt: "2026-01-08T08:00:00.000Z",
  },
];

export const mockMaterials: StudyMaterialResponse[] = [
  {
    id: "mat-cse101-midterm-review",
    fileName: "CSE101 Midterm Review.pdf",
    courseName: "Design and Analysis of Algorithms",
    courseId: "course-cse101",
    materialType: "EXAM",
    status: "READY",
    previewUrl: "/mock-materials/cse101-midterm-review.pdf",
    downloadUrl: "/mock-materials/cse101-midterm-review.pdf",
    contentType: "application/pdf",
    rejectionReason: null,
    createdAt: "2026-06-15T12:00:00.000Z",
  },
  {
    id: "mat-cse101-syllabus",
    fileName: "CSE101 Syllabus.docx",
    courseName: "Design and Analysis of Algorithms",
    courseId: "course-cse101",
    materialType: "NOTES",
    status: "READY",
    previewUrl: null,
    downloadUrl: null,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    rejectionReason: null,
    createdAt: "2026-06-12T12:00:00.000Z",
  },
  {
    id: "mat-math20d-hw4",
    fileName: "MATH20D Homework 4.pdf",
    courseName: "Differential Equations",
    courseId: "course-math20d",
    materialType: "HOMEWORK",
    status: "VALIDATING",
    previewUrl: null,
    downloadUrl: null,
    contentType: "application/pdf",
    rejectionReason: null,
    createdAt: "2026-06-22T12:00:00.000Z",
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv-cse101-study-guide",
    courseId: "course-cse101",
    courseName: "Design and Analysis of Algorithms",
    title: "Generate a midterm study plan",
    createdAt: "2026-06-20T18:00:00.000Z",
    updatedAt: "2026-06-21T18:00:00.000Z",
  },
];

export const mockMessages: Record<string, ChatMessage[]> = {
  "conv-cse101-study-guide": [
    {
      id: "msg-1",
      role: "user",
      content: "Help me study for the algorithms midterm.",
      createdAt: "2026-06-20T18:00:00.000Z",
    },
    {
      id: "msg-2",
      role: "assistant",
      content:
        "From your **Exam: CSE101 Midterm Review.pdf** (Source #1), focus on recurrence solving, graph traversal invariants, and dynamic programming state definitions. A strong study guide should include one worked example for each topic.",
      createdAt: "2026-06-20T18:01:00.000Z",
    },
  ],
};

export const mockSyllabusEvents: SyllabusEvent[] = [
  {
    id: "event-cse101-hw6",
    courseId: "course-cse101",
    title: "Homework 6",
    type: "HOMEWORK",
    dueAt: "2026-06-27T23:59:00.000Z",
    sourceMaterialId: "mat-cse101-syllabus",
  },
  {
    id: "event-cse101-midterm",
    courseId: "course-cse101",
    title: "Midterm 2",
    type: "MIDTERM",
    dueAt: "2026-06-30T17:00:00.000Z",
    sourceMaterialId: "mat-cse101-syllabus",
  },
  {
    id: "event-cse101-final",
    courseId: "course-cse101",
    title: "Final Exam",
    type: "FINAL",
    dueAt: "2026-07-15T16:00:00.000Z",
    sourceMaterialId: "mat-cse101-syllabus",
  },
  {
    id: "event-math20d-final",
    courseId: "course-math20d",
    title: "Final Exam",
    type: "FINAL",
    dueAt: "2026-07-10T14:00:00.000Z",
  },
];

function filterByQuery<T extends { courseId?: string; status?: string }>(
  data: T[],
  url: URL,
): T[] {
  const courseId = url.searchParams.get("courseId");
  const status = url.searchParams.get("status");
  return data.filter((item) => {
    if (courseId && item.courseId !== courseId) return false;
    if (status && item.status !== status) return false;
    return true;
  });
}

function mockEntitySearch<
  T extends { name: string; shortName?: string | null; aliases?: string[]; code?: string },
>(items: T[], query: string) {
  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? items
        .map((item) => {
          const fields = [
            item.name,
            item.shortName ?? "",
            item.code ?? "",
            ...(item.aliases ?? []),
          ].filter(Boolean);
          const exact = fields.some((field) => field.toLowerCase() === normalized);
          const partial = fields.some((field) =>
            field.toLowerCase().includes(normalized),
          );
          if (!exact && !partial) return null;
          return {
            item,
            score: exact ? 1 : 0.5,
            strong: exact,
          };
        })
        .filter((match): match is NonNullable<typeof match> => Boolean(match))
        .sort((a, b) => b.score - a.score)
    : [];
  return {
    matches,
    canCreate: matches.every((match) => !match.strong),
    threshold: 0.65,
  };
}

export function getMockResponse<T>(
  path: string,
  scenario: MockScenario = "default",
): T | undefined {
  const url = new URL(path, "http://mock.local");
  const pathname = url.pathname;

  if (pathname === "/api/schools") {
    const q = url.searchParams.get("q");
    return (q ? mockEntitySearch(mockSchools, q) : mockSchools) as T;
  }
  if (pathname === "/api/professors") {
    const q = url.searchParams.get("q");
    const schoolId = url.searchParams.get("schoolId");
    const professors = schoolId
      ? mockProfessors.filter((professor) => professor.schoolId === schoolId)
      : mockProfessors;
    return (q ? mockEntitySearch(professors, q) : professors) as T;
  }
  const schoolProfessorsMatch = pathname.match(/^\/api\/schools\/([^/]+)\/professors$/);
  if (schoolProfessorsMatch) {
    const q = url.searchParams.get("q");
    const professors = mockProfessors.filter(
      (professor) => professor.schoolId === schoolProfessorsMatch[1],
    );
    return (q ? mockEntitySearch(professors, q) : professors) as T;
  }
  if (pathname === "/api/courses") {
    const courses = scenario === "empty-courses" ? [] : mockCourses;
    const q = url.searchParams.get("q");
    return (q ? mockEntitySearch(courses, q) : courses) as T;
  }
  const schoolCoursesMatch = pathname.match(/^\/api\/schools\/([^/]+)\/courses$/);
  if (schoolCoursesMatch) {
    const q = url.searchParams.get("q");
    const courses = mockCourses.filter(
      (course) => course.schoolId === schoolCoursesMatch[1],
    );
    return (q ? mockEntitySearch(courses, q) : courses) as T;
  }
  if (pathname === "/api/materials") {
    return filterByQuery(mockMaterials, url) as T;
  }
  if (pathname === "/api/conversations") return mockConversations as T;
  if (pathname === "/api/syllabus-events") {
    return filterByQuery(mockSyllabusEvents, url) as T;
  }

  const messagesMatch = pathname.match(
    /^\/api\/conversations\/([^/]+)\/messages$/,
  );
  if (messagesMatch) {
    return (mockMessages[messagesMatch[1]] ?? []) as T;
  }

  return undefined;
}
