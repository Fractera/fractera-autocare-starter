// Слова страницы «Личный кабинет» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type CabinetUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, CabinetUi> = {
  en: { title: "Client cabinet", subtitle: "The cabinet of a clinic's client." },
  ru: { title: "Личный кабинет", subtitle: "Кабинет клиента учреждения." },
}

export function cabinetUi(lang: string): CabinetUi {
  return DICT[lang] ?? DICT.en
}
