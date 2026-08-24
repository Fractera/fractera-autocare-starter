// Слова страницы «Подключение YCLIENTS» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type ConnectYclientsUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, ConnectYclientsUi> = {
  en: { title: "YCLIENTS connection", subtitle: "Where the marketplace brings a new clinic." },
  ru: { title: "Подключение YCLIENTS", subtitle: "Сюда маркетплейс приводит новое учреждение." },
}

export function connectYclientsUi(lang: string): ConnectYclientsUi {
  return DICT[lang] ?? DICT.en
}
