import { AccessGate } from "@/components/auth/access-gate.client"
import { accessGateUi } from "@/components/auth/access-gate.i18n"
import { appDialogUi } from "@/components/dialog/app-dialog.i18n"
import { PageHeader } from "@/components/content-page/page-header.server"
import { passportUi } from "../_data/ui.i18n"
import { passportViewUi } from "../_widgets/dynamic/passport-view/ui.i18n"
import { PassportView } from "../_widgets/dynamic/passport-view/index.client"

// Вход страницы ПАСПОРТА — серверный компонент и статический каркас: заголовок,
// объяснение права, пустое место под текст. Ни одного обращения к диску и ни
// одной строки паспорта здесь нет, и это главное свойство файла.
//
// 🔒 ВТОРАЯ ВЫВЕСКА ПОВЕРХ ГРУППОВОЙ — СУЖЕНИЕ, А НЕ ДУБЛИРОВАНИЕ. Макет группы
// `(admin)` ставит `AccessGate` на `PROTECTED_GROUP_ROLES.admin`, то есть пускает
// и `admin`, и `architect`. Дверь `/api/passport` пускает только `architect`.
// Без этой второй вывески администратор увидел бы страницу без окна отказа и
// упёрся в пустоту с 403 в консоли — «доступ обещали и тут же отказали», дефект,
// уже оплаченный на странице учётных записей. Вывеска обязана повторять замок.
//
// 🔒 ПОЧЕМУ НЕ ПЕРЕНЕСТИ СТРАНИЦУ В СВОЮ ГРУППУ ПРАВ. Группа — это слой прав, а
// не страница: заводить пятую ради одного документа значило бы изобретать там,
// где хватает существующего. `architect` входит во все четыре группы по
// построению, поэтому паспорт лежит в той, чей смысл ему ближе всего, —
// администрирование самого проекта.
export default function PassportEntry({ lang }: { lang: string }) {
  const t = passportUi(lang)
  const ui = passportViewUi(lang)

  return (
    <AccessGate roles={["architect"]} lang={lang} ui={accessGateUi(lang)} dialogUi={appDialogUi(lang)}>
      <main className="min-h-screen bg-background">
        <div data-app-column className="px-6 py-[var(--page-py-work)]">
          <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
          <p className="mt-4 max-w-2xl text-xs text-muted-foreground">{t.roleNote}</p>
          {/* Слова резолвятся ЗДЕСЬ и уезжают в островок пропсами: клиентский
              компонент, импортирующий словарь, увёз бы в браузер все его языки. */}
          <PassportView ui={ui} />
        </div>
      </main>
    </AccessGate>
  )
}
