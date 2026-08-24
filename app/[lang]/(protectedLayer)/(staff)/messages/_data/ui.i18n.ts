// Слова страницы «Переписка» — на этом шаге только заголовок и подпись.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type MessagesUi = {
  title: string
  subtitle: string
}

const DICT: Record<string, MessagesUi> = {
  en: { title: "Messages", subtitle: "Conversations with clients, grouped by phone number." },
  ru: { title: "Переписка", subtitle: "Диалоги с клиентами, сгруппированные по телефону." },
}

export function messagesUi(lang: string): MessagesUi {
  return DICT[lang] ?? DICT.en
}
