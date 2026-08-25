import { PageHeader } from "@/components/content-page/page-header.server"
import { analyticsUi } from "../_data/ui.i18n"
import { clinicAnalyticsUi } from "../_widgets/dynamic/clinic-analytics/ui.i18n"
import { ClinicAnalytics } from "../_widgets/dynamic/clinic-analytics/index.client"

// Вход страницы АНАЛИТИКИ — серверный компонент и статическая оболочка.
export default function AnalyticsEntry({ lang }: { lang: string }) {
  const t = analyticsUi(lang)
  const ui = clinicAnalyticsUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <ClinicAnalytics ui={ui} />
        </div>
      </div>
    </main>
  )
}
