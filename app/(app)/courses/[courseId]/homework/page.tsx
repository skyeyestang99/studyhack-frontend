import { CoursePageClient } from "@/components/course/CoursePageClient";

export default function CourseHomeworkPage({
  params,
}: {
  params: { courseId: string };
}) {
  return <CoursePageClient courseId={params.courseId} view="homework" />;
}
