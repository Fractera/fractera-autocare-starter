// Слова страницы «Аудит базы» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type AuditUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, AuditUi> = {
  en: { title: "Data audit", subtitle: "Whether the numbers behind the decisions can be trusted." },
  ru: { title: "Аудит базы", subtitle: "Можно ли доверять цифрам, по которым принимают решения." },
}

export function auditUi(lang: string): AuditUi {
  return DICT[lang] ?? DICT.en
}
