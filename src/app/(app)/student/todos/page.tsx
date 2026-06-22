import { requireStudentProfile } from "@/lib/auth";
import { getStudentTasks } from "@/server/services/todo.service";
import { PageHeader } from "@/components/page-header";
import { StudentTodos } from "@/components/assignments/student-todos";

export const metadata = { title: "งาน / To-do" };

export default async function StudentTodosPage() {
  const { student } = await requireStudentProfile();
  const tasks = await getStudentTasks(student.id);

  return (
    <div>
      <PageHeader
        title="งาน / To-do"
        description="งานที่ครูมอบหมายและ To-do ของคุณ — ติ๊กว่าเสร็จ หรืออัปโหลดไฟล์ส่งงานได้"
      />
      <StudentTodos tasks={tasks} />
    </div>
  );
}
