import { CoursePageClient } from "@/components/course/CoursePageClient";

export default function CourseChatPage({
  params,
}: {
  params: { courseId: string };
}) {
  return <CoursePageClient courseId={params.courseId} view="chat" />;
}
