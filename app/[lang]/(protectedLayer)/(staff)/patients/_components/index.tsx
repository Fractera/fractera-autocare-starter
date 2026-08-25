import { PageHeader } from "@/components/content-page/page-header.server"
import { patientsUi } from "../_data/ui.i18n"
import { patientsTableUi } from "../_widgets/dynamic/patients-table/ui.i18n"
import { PatientsTable } from "../_widgets/dynamic/patients-table/index.client"

// Вход страницы ЛЮДЕЙ — серверный компонент и статический каркас: крошки,
// заголовок, объяснение. Ни одного запроса к базе, поэтому страница
// предрендерена на каждый язык, как и её соседи.
//
// 🔒 ЗДЕСЬ ПРОХОДИТ ГЛАВНАЯ ЧЕРТА ЭТОЙ МОДЕЛИ: страница пользователя — это
// СТАТИЧЕСКАЯ страница с динамическими дырами, а не динамическая страница. Одна
// строка `headers()` или `cookies()` вывела бы из предрендера ВЕСЬ защищённый
// слой; сессию законно читает дверь `/api/care/people`.
//
// Слова резолвятся ЗДЕСЬ и уезжают в островок пропсами: клиентский компонент,
// импортирующий словарь, увёз бы в браузер все его языки.
export default function PatientsEntry({ lang }: { lang: string }) {
  const t = patientsUi(lang)
  const ui = patientsTableUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <PatientsTable lang={lang} ui={ui} />
        </div>
      </div>
    </main>
  )
}
