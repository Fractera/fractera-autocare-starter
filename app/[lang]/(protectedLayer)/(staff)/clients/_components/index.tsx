import { PageHeader } from "@/components/content-page/page-header.server"
import { clientsUi } from "../_data/ui.i18n"
import { vipCandidatesUi } from "../_widgets/dynamic/vip-candidates/ui.i18n"
import { VipCandidates } from "../_widgets/dynamic/vip-candidates/index.client"

// Вход страницы КЛИЕНТОВ — серверный компонент и статическая оболочка.
export default function ClientsEntry({ lang }: { lang: string }) {
  const t = clientsUi(lang)
  const ui = vipCandidatesUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <VipCandidates lang={lang} ui={ui} />
        </div>
      </div>
    </main>
  )
}
