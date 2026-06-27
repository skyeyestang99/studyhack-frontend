import { CoursePageClient } from "@/components/course/CoursePageClient";

export default function CourseExamsPage({
  params,
}: {
  params: { courseId: string };
}) {
  return <CoursePageClient courseId={params.courseId} view="exams" />;
}
