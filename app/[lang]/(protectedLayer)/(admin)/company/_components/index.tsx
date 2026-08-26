import { SlidersHorizontal } from "lucide-react"
import { PageHeader } from "@/components/content-page/page-header.server"
import { getAppConfig } from "@/config/app-config"
import { adminUrlFromSite } from "@/lib/site-urls"
import { companyUi } from "../_data/ui.i18n"
import { CompanyForm } from "../_widgets/dynamic/company-form/index.client"
import { companyFormUi } from "../_widgets/dynamic/company-form/ui.i18n"

// «ДАННЫЕ КОМПАНИИ» — экран администратора (шаг 22, заказ Ромы 2026-08-25).
//
// Заглушка шага 7 наполнена: два поля, которые названы в заказе, — название компании и
// контактный телефон. Каркас по-прежнему собран платформенным примитивом `PageHeader`.
//
// Форма — ДИНАМИЧЕСКИЙ виджет: она ходит за данными по действию человека, а не рисуется
// сразу вместе со страницей. Слова резолвятся ЗДЕСЬ, на сервере, и уходят в островок
// готовыми строками — в браузер уезжает один язык, а не корпус.
export default function CompanyEntry({ lang }: { lang: string }) {
  const t = companyUi(lang)
  const adminUrl = adminUrlFromSite(getAppConfig().url)
  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-8">
          <CompanyForm ui={companyFormUi(lang)} />

          {/* 🔒 ПРЕДЕЛ ЭКРАНА НАЗВАН НА САМОМ ЭКРАНЕ (заказ Ромы 2026-08-25). Здесь
              правятся ПЯТЬ вещей, а настроек у сайта десятки: палитра, шрифты, меню,
              языки, страницы. Человек, не нашедший тут нужного, должен узнать, где оно
              есть, — иначе он решит, что настройки нет вовсе.

              🔒 АДРЕС ПАНЕЛИ ВЫВОДИТСЯ ИЗ АДРЕСА САЙТА, а не зашит: на домене это
              admin.<домен>, на голом IP — <ip>:3002. Настроек ещё нет — адрес пуст, и
              ссылки просто не будет: выдуманный адрес панели хуже отсутствующего. Тот же
              резолвер работает в подвале, второй способ вычислять его разошёлся бы. */}
          {adminUrl && (
            <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-6 text-[11px] text-muted-foreground">
              {companyFormUi(lang).panelFooter}
              <a href={adminUrl} rel="nofollow" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                <SlidersHorizontal className="size-3" />
                {companyFormUi(lang).panelLink}
              </a>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
