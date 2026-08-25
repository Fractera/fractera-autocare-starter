// Слова виджета «переписка». 🔒 Два языка вместо десяти — записанный долг;
// временное упрощение проекта: в оба залит русский текст.

export type MessageThreadsUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string

  empty: string
  emptyHint: string
  emptyThread: string

  sumThreads: string
  sumMessages: string
  sumUnknown: string
  sumAi: string

  unknownNumber: string
  unknownNumberHint: string
  noConsent: string
  incoming: string
  outgoing: string
  aiGenerated: string
  openCard: string
  back: string
  threadOf: string
}

const RU: MessageThreadsUi = {
  loading: "Читаем переписку…",
  failed: "Не удалось прочитать переписку.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",

  empty: "Переписки ещё нет",
  emptyHint: "Сообщения приходят через канал связи, и он пока не подключён. Когда подключится, здесь появятся ветки — по одной на номер телефона, включая номера, которых нет в базе.",
  emptyThread: "В этой ветке нет сообщений.",

  sumThreads: "веток",
  sumMessages: "сообщений",
  sumUnknown: "номеров без карточки",
  sumAi: "ответила модель",

  unknownNumber: "номера нет в базе",
  unknownNumberHint: "Человек написал с номера, которого нет ни в одной карточке. Такие ветки видны намеренно: это живое обращение, и разобрать его должен человек.",
  noConsent: "не писать",
  incoming: "входящее",
  outgoing: "исходящее",
  aiGenerated: "написала модель",
  openCard: "Карточка",
  back: "Ко всем веткам",
  threadOf: "Разговор с",
}

const DICT: Record<string, MessageThreadsUi> = { en: RU, ru: RU }

export function messageThreadsUi(lang: string): MessageThreadsUi {
  return DICT[lang] ?? DICT.en
}
