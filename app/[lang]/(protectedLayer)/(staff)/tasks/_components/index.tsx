import { appDialogUi } from "@/components/dialog/app-dialog.i18n"
import { PageHeader } from "@/components/content-page/page-header.server"
import { tasksUi } from "../_data/ui.i18n"
import { tasksQueueUi } from "../_widgets/dynamic/tasks-queue/ui.i18n"
import { TasksQueue } from "../_widgets/dynamic/tasks-queue/index.client"

// Вход страницы ЗАДАЧ — серверный компонент и статическая оболочка. Сессию
// законно читает дверь `/api/care/tasks`, а не страница: одна строка
// `headers()` вывела бы из предрендера весь защищённый слой.
export default function TasksEntry({ lang }: { lang: string }) {
  const t = tasksUi(lang)
  const ui = tasksQueueUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <TasksQueue lang={lang} ui={ui} dialogUi={appDialogUi(lang)} />
        </div>
      </div>
    </main>
  )
}
