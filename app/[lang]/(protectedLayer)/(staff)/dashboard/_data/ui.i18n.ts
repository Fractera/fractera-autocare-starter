// Слова страницы «Обзор» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type DashboardUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, DashboardUi> = {
  en: { title: "Overview", subtitle: "What the system found, what is in progress and what it produced." },
  ru: { title: "Обзор", subtitle: "Что система нашла, что в работе и что это дало." },
}

export function dashboardUi(lang: string): DashboardUi {
  return DICT[lang] ?? DICT.en
}
