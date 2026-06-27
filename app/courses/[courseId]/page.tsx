import { CoursePageClient } from "@/components/course/CoursePageClient";

export default function CoursePage({
  params,
}: {
  params: { courseId: string };
}) {
  return <CoursePageClient courseId={params.courseId} view="home" />;
}
