// Слова виджета «аналитика». 🔒 Два языка вместо десяти — записанный долг;
// временное упрощение проекта: в оба залит русский текст.

export type ClinicAnalyticsUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string

  moneyTitle: string
  revenue: string
  revenueHint: string
  visits: string
  visitsHint: string
  avgCheck: string
  avgCheckHint: string
  excludedRevenue: string
  excludedRevenueHint: string

  baseTitle: string
  people: string
  peopleHint: string
  peopleWithVisits: string
  peopleWithVisitsHint: string
  noFuture: string
  noFutureHint: string

  recencyTitle: string
  recencyHint: string
  r0_30: string
  r31_90: string
  r91_180: string
  r181_365: string
  r365plus: string
  rNever: string

  attendanceTitle: string
  came: string
  missed: string
  unknownAtt: string
  unknownAttHint: string
  missedShare: string
  missedShareHint: string

  topTitle: string
  colService: string
  colVisits: string
  colRevenue: string
  staffTitle: string
  colStaff: string
  empty: string
  emptyHint: string
}

const RU: ClinicAnalyticsUi = {
  loading: "Считаем…",
  failed: "Не удалось посчитать.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",

  moneyTitle: "Деньги",
  revenue: "Выручка",
  revenueHint: "Сумма по истории визитов за окно выгрузки: два года назад и 90 дней вперёд.",
  visits: "Приёмов",
  visitsHint: "Записей CRM, а не строк услуг: приём с двумя услугами считается один раз.",
  avgCheck: "Средний чек",
  avgCheckHint: "Выручка, делённая на число приёмов.",
  excludedRevenue: "Не в счёте",
  excludedRevenueHint: "Выручка по услугам, помеченным «не учитывать» в каталоге.",

  baseTitle: "База",
  people: "Людей",
  peopleHint: "Карточки с разобранным телефоном.",
  peopleWithVisits: "С визитами",
  peopleWithVisitsHint: "У остальных карточка есть, а приёмов в окне выгрузки нет.",
  noFuture: "Без записи вперёд",
  noFutureHint: "🔴 Главное число этого экрана: человек был, но следующий приём не назначен. Это и есть те, кого можно потерять.",

  recencyTitle: "Когда были в последний раз",
  recencyHint: "Считается по истории визитов, а не по колонке карточки: колонка заполнена у меньшинства, и отчёт по ней врал бы о трети базы.",
  r0_30: "до 30 дней",
  r31_90: "31–90 дней",
  r91_180: "91–180 дней",
  r181_365: "181–365 дней",
  r365plus: "больше года",
  rNever: "ни одного состоявшегося",

  attendanceTitle: "Явка",
  came: "Пришли",
  missed: "Не пришли",
  unknownAtt: "Без отметки",
  unknownAttHint: "Приём записан, но администратор не отметил, пришёл человек или нет. Это объём небрежности в CRM, а не поведение людей — в долю неявок не входит.",
  missedShare: "Доля неявок",
  missedShareHint: "Считается только от отмеченных: пришёл против не пришёл. Неотмеченное не участвует ни в числителе, ни в знаменателе.",

  topTitle: "Услуги, дающие выручку",
  colService: "Услуга",
  colVisits: "Оказано",
  colRevenue: "Выручка",
  staffTitle: "Кто принимал",
  colStaff: "Врач",
  empty: "Считать пока нечего",
  emptyHint: "Аналитика строится по истории визитов. Пока синхронизация не привезла данные, цифр нет.",
}

const DICT: Record<string, ClinicAnalyticsUi> = { en: RU, ru: RU }

export function clinicAnalyticsUi(lang: string): ClinicAnalyticsUi {
  return DICT[lang] ?? DICT.en
}
