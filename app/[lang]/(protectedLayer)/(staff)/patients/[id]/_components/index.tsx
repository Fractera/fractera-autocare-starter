import { PageHeader } from "@/components/content-page/page-header.server"
import { patientCardUi } from "../_data/ui.i18n"
import { personCardUi } from "../_widgets/dynamic/person-card/ui.i18n"
import { PersonCard } from "../_widgets/dynamic/person-card/index.client"

// Вход КАРТОЧКИ ЧЕЛОВЕКА — серверный компонент и статическая оболочка.
//
// 🔒 ОБОЛОЧКА НЕ ЗНАЕТ, ЧЬЯ ЭТО КАРТОЧКА, И НЕ ДОЛЖНА. Имя лежит за дверью, а
// дверь читает сессию; спросить его здесь значило бы сходить в базу до всякой
// проверки права и вывести из предрендера весь защищённый слой. Поэтому `<h1>`
// говорит, ЧТО это за экран, а имя рисует островок.
//
// 🔒 КРОШКА «Пациенты» — ССЫЛКА. Карточка открывается из списка, и дорога назад
// обязана быть на месте: иначе единственный выход — кнопка браузера.
//
// Слова резолвятся ЗДЕСЬ и уезжают в островок пропсами: клиентский компонент,
// импортирующий словарь, увёз бы в браузер все его языки.
export default function PatientEntry({ lang, id }: { lang: string; id: string }) {
  const t = patientCardUi(lang)
  const ui = personCardUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader
          lang={lang}
          breadcrumbs={[{ label: t.parent, href: `/${lang}/patients` }, { label: t.title }]}
          title={t.title}
          subtitle={t.subtitle}
        />
        <div className="mt-6">
          <PersonCard id={id} lang={lang} ui={ui} />
        </div>
      </div>
    </main>
  )
}
