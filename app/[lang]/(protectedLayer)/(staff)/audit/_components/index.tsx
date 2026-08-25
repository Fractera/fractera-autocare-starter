import { PageHeader } from "@/components/content-page/page-header.server"
import { auditUi } from "../_data/ui.i18n"
import { baseAuditUi } from "../_widgets/dynamic/base-audit/ui.i18n"
import { BaseAudit } from "../_widgets/dynamic/base-audit/index.client"

// Вход страницы АУДИТА — серверный компонент и статическая оболочка.
// Сессию законно читает дверь `/api/care/audit`, а не страница: одна строка
// `headers()` вывела бы из предрендера весь защищённый слой.
export default function AuditEntry({ lang }: { lang: string }) {
  const t = auditUi(lang)
  const ui = baseAuditUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <BaseAudit ui={ui} />
        </div>
      </div>
    </main>
  )
}
