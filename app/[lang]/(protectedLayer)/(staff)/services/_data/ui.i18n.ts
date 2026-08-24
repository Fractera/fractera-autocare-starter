// Слова страницы «Услуги» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type ServicesUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, ServicesUi> = {
  en: { title: "Services", subtitle: "The service catalogue and its care protocols." },
  ru: { title: "Услуги", subtitle: "Каталог услуг и протоколы сопровождения." },
}

export function servicesUi(lang: string): ServicesUi {
  return DICT[lang] ?? DICT.en
}
