import { CoursePageClient } from "@/components/course/CoursePageClient";

export default function CourseMaterialsPage({
  params,
}: {
  params: { courseId: string };
}) {
  return <CoursePageClient courseId={params.courseId} view="materials" />;
}
