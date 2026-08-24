// Слова страницы «Пациенты» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type PatientsUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, PatientsUi> = {
  en: { title: "Patients", subtitle: "The clinic's client base with segments and filters." },
  ru: { title: "Пациенты", subtitle: "База клиентов учреждения с сегментами и фильтрами." },
}

export function patientsUi(lang: string): PatientsUi {
  return DICT[lang] ?? DICT.en
}
