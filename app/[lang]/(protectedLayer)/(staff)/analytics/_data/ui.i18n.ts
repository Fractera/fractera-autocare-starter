// Слова страницы «Аналитика» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type AnalyticsUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, AnalyticsUi> = {
  en: { title: "Analytics", subtitle: "Revenue, average cheque, top services, staff breakdown." },
  ru: { title: "Аналитика", subtitle: "Выручка, средний чек, топ услуг, разрезы по сотрудникам." },
}

export function analyticsUi(lang: string): AnalyticsUi {
  return DICT[lang] ?? DICT.en
}
