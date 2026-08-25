// Слова страницы «Карточка пациента» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type PatientCardUi = {
  title: string
  subtitle: string
  /** Крошка на список: карточку открывают из него, и дорога назад обязана быть. */
  parent: string
}

const DICT: Record<string, PatientCardUi> = {
  en: {
    title: "Patient card",
    subtitle: "Visits, tasks, correspondence and history of one person.",
    parent: "Patients",
  },
  ru: {
    title: "Карточка пациента",
    subtitle: "Визиты, задачи, переписка и история одного человека.",
    parent: "Пациенты",
  },
}

export function patientCardUi(lang: string): PatientCardUi {
  return DICT[lang] ?? DICT.en
}
