// Слова виджета «очередь задач» — свои, не общие с таблицей людей.
// 🔒 Два языка вместо десяти — записанный долг. Временное упрощение проекта:
// в оба языка залит русский текст.

export type TasksQueueUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string

  tabToday: string
  tabOpen: string
  tabDone: string
  tabAll: string

  emptyToday: string
  emptyTodayHint: string
  emptyOpen: string
  emptyDone: string
  emptyAll: string
  emptyAllHint: string

  colPerson: string
  colReason: string
  colDue: string
  colStatus: string
  noScenario: string
  overdue: string
  today: string
  noConsent: string

  count: string
  perPage: string
  pageOf: string
  first: string
  prev: string
  next: string
  last: string

  st_new: string
  st_in_progress: string
  st_contacted: string
  st_booked: string
  st_no_answer: string
  st_declined: string
  st_postponed: string
}

const RU: TasksQueueUi = {
  loading: "Читаем очередь…",
  failed: "Не удалось прочитать очередь.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",

  tabToday: "К работе",
  tabOpen: "Открытые",
  tabDone: "Закрытые",
  tabAll: "Все",

  emptyToday: "На сегодня работы нет",
  emptyTodayHint: "Здесь появляются задачи, у которых наступил срок. Просроченные не исчезают — они остаются тут же.",
  emptyOpen: "Открытых задач нет.",
  emptyDone: "Закрытых задач пока нет.",
  emptyAll: "Задач ещё не заводили",
  emptyAllHint: "Очередь наполняют сценарии — правила, по которым система решает, кого и когда коснуться. Пока их нет, задачи заводятся руками.",

  colPerson: "Человек",
  colReason: "Повод",
  colDue: "Срок",
  colStatus: "Статус",
  noScenario: "заведено вручную",
  overdue: "просрочено",
  today: "сегодня",
  noConsent: "не писать",

  count: "Задач в отборе: {count}",
  perPage: "Строк",
  pageOf: "страница {page} из {pages}",
  first: "В начало",
  prev: "Назад",
  next: "Вперёд",
  last: "В конец",

  st_new: "новая",
  st_in_progress: "в работе",
  st_contacted: "связались",
  st_booked: "записался",
  st_no_answer: "не ответил",
  st_declined: "отказался",
  st_postponed: "отложена",
}

const DICT: Record<string, TasksQueueUi> = { en: RU, ru: RU }

export function tasksQueueUi(lang: string): TasksQueueUi {
  return DICT[lang] ?? DICT.en
}

/** Статус словом. Ключи собраны здесь, чтобы строка не знала про словарь. */
export function statusWord(status: string, ui: TasksQueueUi): string {
  const map: Record<string, string> = {
    new: ui.st_new,
    in_progress: ui.st_in_progress,
    contacted: ui.st_contacted,
    booked: ui.st_booked,
    no_answer: ui.st_no_answer,
    declined: ui.st_declined,
    postponed: ui.st_postponed,
  }
  return map[status] ?? status
}
