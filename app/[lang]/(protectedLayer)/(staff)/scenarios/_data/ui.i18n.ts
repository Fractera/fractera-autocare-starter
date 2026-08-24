// Слова страницы «Сценарии» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type ScenariosUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, ScenariosUi> = {
  en: { title: "Scenarios", subtitle: "The chain rules: who to contact and when. The product's core." },
  ru: { title: "Сценарии", subtitle: "Правила цепочек: кого и когда касаться. Ядро продукта." },
}

export function scenariosUi(lang: string): ScenariosUi {
  return DICT[lang] ?? DICT.en
}
