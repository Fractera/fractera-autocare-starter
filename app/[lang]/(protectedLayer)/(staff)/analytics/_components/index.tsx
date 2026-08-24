import { PageHeader } from "@/components/content-page/page-header.server"
import { analyticsUi } from "../_data/ui.i18n"

// ЗАГЛУШКА ШАГА 7. Маршрут утверждённого дерева существует и открывается; кроме
// заголовка на нём пока ничего нет — это шаг скелета, а не наполнения.
//
// Каркас собран платформенным примитивом `PageHeader`, а не собственной
// разметкой: заглушка строится средствами архитектуры.
export default function AnalyticsEntry({ lang }: { lang: string }) {
  const t = analyticsUi(lang)
  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
      </div>
    </main>
  )
}
