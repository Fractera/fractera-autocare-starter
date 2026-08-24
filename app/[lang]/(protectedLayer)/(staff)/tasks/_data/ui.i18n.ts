// Слова страницы «Задачи» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type TasksUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, TasksUi> = {
  en: { title: "Tasks", subtitle: "The contact queue: who to write to and why." },
  ru: { title: "Задачи", subtitle: "Очередь контактов: кому и по какому поводу написать." },
}

export function tasksUi(lang: string): TasksUi {
  return DICT[lang] ?? DICT.en
}
