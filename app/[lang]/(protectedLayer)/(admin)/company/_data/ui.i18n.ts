// Слова страницы «Данные компании» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type CompanyUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, CompanyUi> = {
  en: { title: "Company details", subtitle: "The clinic's settings, owned by the administrator." },
  ru: { title: "Данные компании", subtitle: "Настройки учреждения, которыми владеет администратор." },
}

export function companyUi(lang: string): CompanyUi {
  return DICT[lang] ?? DICT.en
}
