import { CoursePageClient } from "@/components/course/CoursePageClient";

export default function CourseStudyGuidePage({
  params,
}: {
  params: { courseId: string };
}) {
  return <CoursePageClient courseId={params.courseId} view="study-guide" />;
}
