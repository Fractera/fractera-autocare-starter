// Слова виджета «обзор смены». 🔒 Два языка вместо десяти — записанный долг;
// временное упрощение проекта: в оба залит русский текст.

export type ShiftOverviewUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string

  queueTitle: string
  dueToday: string
  dueTodayHint: string
  overdue: string
  overdueHint: string
  openTasks: string
  openTasksHint: string
  toQueue: string

  resultTitle: string
  booked: string
  bookedHint: string
  done: string
  doneHint: string
  conversion: string
  conversionHint: string
  noConversion: string

  rulesTitle: string
  activeRules: string
  activeRulesHint: string
  noRules: string
  noRulesHint: string
  toRules: string

  baseTitle: string
  people: string
  refused: string
  refusedHint: string
  incoming: string
  incomingHint: string

  syncAt: string
  syncNever: string
  syncStale: string
}

const RU: ShiftOverviewUi = {
  loading: "Собираем обзор…",
  failed: "Не удалось собрать обзор.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",

  queueTitle: "Что делать сейчас",
  dueToday: "Задач к работе",
  dueTodayHint: "Срок наступил, статус открытый. Просроченные считаются здесь же — они не исчезают.",
  overdue: "Просрочено",
  overdueHint: "Срок прошёл, а задача не закрыта. Каждая такая — человек, до которого не дошли вовремя.",
  openTasks: "Открыто всего",
  openTasksHint: "Включая те, чей срок ещё не наступил.",
  toQueue: "Открыть очередь",

  resultTitle: "Что это дало",
  booked: "Записались",
  bookedHint: "Задачи, кончившиеся записью на приём. Ради этого продукт и существует.",
  done: "Закрыто задач",
  doneHint: "Работа по ним окончена, чем бы ни кончилась.",
  conversion: "Доходит до записи",
  conversionHint: "Доля записей среди закрытых задач.",
  noConversion: "закрытых задач ещё нет — судить не по чему",

  rulesTitle: "Правила",
  activeRules: "Работает правил",
  activeRulesHint: "Правило решает, кого и когда коснуться. Выключенные не запускаются.",
  noRules: "Правил ещё нет",
  noRulesHint: "Пока их нет, очередь наполняется только вручную: система никого не находит сама.",
  toRules: "Открыть правила",

  baseTitle: "База",
  people: "Людей",
  refused: "Отказались от сообщений",
  refusedHint: "Письменный отказ в CRM. Им продукт не пишет — предохранитель не даёт завести задачу.",
  incoming: "Входящих сообщений",
  incomingHint: "Пока канал связи не подключён, здесь ноль.",

  syncAt: "Данные из CRM обновлены",
  syncNever: "🔴 Синхронизации ещё не было: база пуста, и всё, что ниже, посчитано ни по чему.",
  syncStale: "🔴 Данные старше суток — цифры могут врать.",
}

const DICT: Record<string, ShiftOverviewUi> = { en: RU, ru: RU }

export function shiftOverviewUi(lang: string): ShiftOverviewUi {
  return DICT[lang] ?? DICT.en
}
