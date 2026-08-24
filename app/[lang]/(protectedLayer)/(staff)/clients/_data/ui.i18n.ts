// Слова страницы «Клиенты» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type ClientsUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, ClientsUi> = {
  en: { title: "Clients", subtitle: "Granting the VIP role to a client of the clinic." },
  ru: { title: "Клиенты", subtitle: "Назначение роли VIP клиенту учреждения." },
}

export function clientsUi(lang: string): ClientsUi {
  return DICT[lang] ?? DICT.en
}
