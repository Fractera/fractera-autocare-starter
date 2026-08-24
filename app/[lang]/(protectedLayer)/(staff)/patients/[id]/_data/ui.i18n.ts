// Слова страницы «Карточка пациента» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type PatientCardUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, PatientCardUi> = {
  en: { title: "Patient card", subtitle: "Visits, tasks, correspondence and history of one person." },
  ru: { title: "Карточка пациента", subtitle: "Визиты, задачи, переписка и история одного человека." },
}

export function patientCardUi(lang: string): PatientCardUi {
  return DICT[lang] ?? DICT.en
}
