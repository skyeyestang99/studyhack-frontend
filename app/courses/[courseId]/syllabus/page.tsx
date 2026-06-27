import { CoursePageClient } from "@/components/course/CoursePageClient";

export default function CourseSyllabusPage({
  params,
}: {
  params: { courseId: string };
}) {
  return <CoursePageClient courseId={params.courseId} view="syllabus" />;
}
