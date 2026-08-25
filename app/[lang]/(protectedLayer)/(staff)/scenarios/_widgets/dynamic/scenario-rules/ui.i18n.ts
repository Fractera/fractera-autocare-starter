// Слова виджета «правила очереди». 🔒 Два языка вместо десяти — записанный долг;
// временное упрощение проекта: в оба залит русский текст.

export type ScenarioRulesUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string

  empty: string
  emptyHint: string
  create: string
  createTitle: string
  cancel: string
  save: string
  saved: string

  fTitle: string
  fTitleHint: string
  fTrigger: string
  fOffset: string
  fOffsetHint: string
  fDirection: string
  fDirectionHint: string
  fGoal: string
  fGoalHint: string

  active: string
  inactive: string
  turnOn: string
  turnOff: string

  measure: string
  tasksTotal: string
  tasksBooked: string
  tasksOpen: string
  conversion: string
  noMeasure: string

  candidates: string
  countNow: string
  run: string
  running: string
  ranTitle: string
  ranCreated: string
  ranSkipped: string
  skNoConsent: string
  skHasOpen: string
  skRecent: string
  skUnknown: string

  manualTrigger: string
  noDataTrigger: string
  offWontRun: string

  tr_no_visit_for_days: string
  tr_upcoming_visit: string
  tr_after_visit: string
  tr_birthday: string
  tr_unfinished_treatment: string
  tr_manual_segment: string
}

const RU: ScenarioRulesUi = {
  loading: "Читаем правила…",
  failed: "Не удалось прочитать правила.",
  forbidden: "Менять правила может только администратор.",
  unreachable: "Слой данных не ответил.",

  empty: "Правил ещё нет",
  emptyHint: "Правило решает, кого и когда коснуться. Пока их нет, задачи заводятся руками по одному человеку.",
  create: "Новое правило",
  createTitle: "Новое правило",
  cancel: "Отмена",
  save: "Сохранить",
  saved: "Правило сохранено",

  fTitle: "Название",
  fTitleHint: "Как правило называется в списке.",
  fTrigger: "Когда срабатывает",
  fOffset: "Порог, дней",
  fOffsetHint: "Сколько дней «не был» — или за сколько дней предупредить.",
  fDirection: "Только по услуге",
  fDirectionHint: "Пусто — правило касается всех. Иначе — только тех, кому эту услугу оказывали.",
  fGoal: "Цель контакта",
  fGoalHint: "Ради чего пишем человеку. Эту фразу получит модель, когда придёт черёд текста.",

  active: "работает",
  inactive: "выключено",
  turnOn: "Включить",
  turnOff: "Выключить",

  measure: "Мера пользы",
  tasksTotal: "задач породило",
  tasksBooked: "из них записались",
  tasksOpen: "открыто сейчас",
  conversion: "доходит до записи",
  noMeasure: "ещё не запускалось — судить не по чему",

  candidates: "Подходит сейчас",
  countNow: "Посчитать",
  run: "Завести задачи",
  running: "Заводим…",
  ranTitle: "Правило отработало",
  ranCreated: "создано задач: {n}",
  ranSkipped: "отсеяно:",
  skNoConsent: "нет согласия — {n}",
  skHasOpen: "уже есть открытая — {n}",
  skRecent: "касались недавно — {n}",
  skUnknown: "нет в базе — {n}",

  manualTrigger: "Этот триггер сводится вручную: людей выбирают на экране, а не запросом.",
  noDataTrigger: "🔴 У этого триггера нет данных на текущем филиале — правило не сработает ни разу.",
  offWontRun: "Выключенное правило не запускается.",

  tr_no_visit_for_days: "давно не был",
  tr_upcoming_visit: "скоро придёт",
  tr_after_visit: "после визита",
  tr_birthday: "день рождения",
  tr_unfinished_treatment: "незаконченное лечение",
  tr_manual_segment: "ручной отбор",
}

const DICT: Record<string, ScenarioRulesUi> = { en: RU, ru: RU }

export function scenarioRulesUi(lang: string): ScenarioRulesUi {
  return DICT[lang] ?? DICT.en
}

/** Триггер словом. */
export function triggerWord(t: string, ui: ScenarioRulesUi): string {
  const map: Record<string, string> = {
    no_visit_for_days: ui.tr_no_visit_for_days,
    upcoming_visit: ui.tr_upcoming_visit,
    after_visit: ui.tr_after_visit,
    birthday: ui.tr_birthday,
    unfinished_treatment: ui.tr_unfinished_treatment,
    manual_segment: ui.tr_manual_segment,
  }
  return map[t] ?? t
}
