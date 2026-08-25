import { PageHeader } from "@/components/content-page/page-header.server"
import { cabinetUi } from "../_data/ui.i18n"
import { CabinetTitle } from "../_widgets/dynamic/cabinet-title/index.client"

// Вход КАБИНЕТА — статический каркас; заголовок зависит от роли.
//
// 🔒 ТЕКСТ ЗАГОЛОВКА ПРИНОСИТ ОСТРОВОК, А РИСУЕТ ЕГО ШАПКА. Роль известна только
// после гидратации, но раскладка заголовка принадлежит примитиву: островок
// отдаёт строку, `PageHeader` печатает `H1`. Так первый заголовок на странице
// остаётся ровно один и живёт там же, где у всех соседей.
export default function CabinetEntry({ lang }: { lang: string }) {
  const t = cabinetUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader
          lang={lang}
          breadcrumbs={[{ label: t.title }]}
          title={<CabinetTitle ui={t} />}
          subtitle={t.subtitle}
        />
      </div>
    </main>
  )
}
