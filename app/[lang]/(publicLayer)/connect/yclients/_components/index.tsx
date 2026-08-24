import { createContentPage } from '@/lib/content/create-content-page'
import { brand } from '@/lib/brand'
import { connectYclientsUi } from '../_data/ui.i18n'

// ЗАГЛУШКА ШАГА 7 — публичная страница приёма подключения из маркетплейса.
// Маршрут утверждённого дерева существует и открывается; кроме заголовка на нём
// пока ничего нет.
//
// 🔒 СОБИРАЕТСЯ ФАБРИКОЙ, А НЕ СВОЕЙ РАЗМЕТКОЙ. Первая редакция открывала
// собственный `<main>` с `PageHeader`, как соседи из защищённого слоя, — и три
// сторожа отказали хором, каждый по своей причине: `check:layout` («оболочка
// публичной страницы одна — PageShell»), `check:seo` («нет generateMetadata —
// страница возьмёт чужой заголовок у макета»), `check:aio` («публичная страница
// без markdown-версии»). Публичный слой строже защищённого, и разница не в
// вежливости: сюда приходят поисковик и агент.
//
// `createContentPage` закрывает все три разом: предрендер по языкам, hreflang,
// OpenGraph, JSON-LD, крошки и единая оболочка.
//
// 🔒 `blocks: []` — намеренно. Наполнение придёт своим шагом; пустой список
// оставляет страницу целой, а не полупостроенной.

const page = createContentPage({
  meta: { subPath: '/connect/yclients', ogImage: '/og-default.png' },
  resolve: lang => {
    const ui = connectYclientsUi(lang)
    return {
      title: ui.title,
      description: ui.subtitle,
      keywords: '',
      blocks: [],
    }
  },
  chrome: lang => ({
    breadcrumbs: [{ label: connectYclientsUi(lang).title }],
    backHref: `/${lang}`,
    backLabel: brand().name,
  }),
})

export const generateMetadata = page.generateMetadata
export default page.Page
