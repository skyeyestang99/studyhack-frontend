import { CoursePageClient } from "@/components/course/CoursePageClient";

export default function CourseSettingsPage({
  params,
}: {
  params: { courseId: string };
}) {
  return <CoursePageClient courseId={params.courseId} view="settings" />;
}
