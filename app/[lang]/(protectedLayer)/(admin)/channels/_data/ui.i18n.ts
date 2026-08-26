// Слова страницы «Настройка каналов связи» (шаг 32).
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА; долг записан в `development-docs/TRANSLATION-DEBT.md`.

export type ChannelsUi = { title: string; subtitle: string }

const DICT: Record<string, ChannelsUi> = {
  en: {
    title: "Communication channels",
    subtitle: "How the clinic talks to people: messengers, keys, what the answer is allowed to know, and the instruction it follows.",
  },
  ru: {
    title: "Настройка каналов связи",
    subtitle: "Как учреждение разговаривает с людьми: мессенджеры, ключи, что позволено знать ответу и по какой инструкции он его составляет.",
  },
}

export function channelsUi(lang: string): ChannelsUi {
  return DICT[lang] ?? DICT.en
}
