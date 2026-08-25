import { PageHeader } from "@/components/content-page/page-header.server"
import { scenariosUi } from "../_data/ui.i18n"
import { scenarioRulesUi } from "../_widgets/dynamic/scenario-rules/ui.i18n"
import { ScenarioRules } from "../_widgets/dynamic/scenario-rules/index.client"

// Вход страницы СЦЕНАРИЕВ — серверный компонент и статическая оболочка.
// Сессию законно читает дверь `/api/care/scenarios`, а не страница.
export default function ScenariosEntry({ lang }: { lang: string }) {
  const t = scenariosUi(lang)
  const ui = scenarioRulesUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <ScenarioRules ui={ui} />
        </div>
      </div>
    </main>
  )
}
