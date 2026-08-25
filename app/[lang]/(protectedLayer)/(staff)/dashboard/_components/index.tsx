import { PageHeader } from "@/components/content-page/page-header.server"
import { dashboardUi } from "../_data/ui.i18n"
import { shiftOverviewUi } from "../_widgets/dynamic/shift-overview/ui.i18n"
import { ShiftOverview } from "../_widgets/dynamic/shift-overview/index.client"

// Вход страницы ОБЗОРА — серверный компонент и статическая оболочка.
export default function DashboardEntry({ lang }: { lang: string }) {
  const t = dashboardUi(lang)
  const ui = shiftOverviewUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <ShiftOverview lang={lang} ui={ui} />
        </div>
      </div>
    </main>
  )
}
