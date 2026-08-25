import { PageHeader } from "@/components/content-page/page-header.server"
import { servicesUi } from "../_data/ui.i18n"
import { serviceCatalogueUi } from "../_widgets/dynamic/service-catalogue/ui.i18n"
import { ServiceCatalogue } from "../_widgets/dynamic/service-catalogue/index.client"

// Вход страницы УСЛУГ — серверный компонент и статическая оболочка.
export default function ServicesEntry({ lang }: { lang: string }) {
  const t = servicesUi(lang)
  const ui = serviceCatalogueUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <ServiceCatalogue ui={ui} />
        </div>
      </div>
    </main>
  )
}
