// Слова виджета «база людей» — СВОИ, а не общие с соседними таблицами.
// Изоляция виджетов: у этой таблицы свои колонки и свой предмет — человек
// учреждения, а не учётная запись и не товар.
//
// 🔒 ДВА ЯЗЫКА ВМЕСТО ДЕСЯТИ — ЗАПИСАННЫЙ ДОЛГ (решение владельца 2026-08-21).
// Виджету положен страничный набор из десяти; сейчас написан включённый набор
// проекта, а недостающие восемь стоят строкой в долге переводов.
//
// 🔒 ВРЕМЕННОЕ УПРОЩЕНИЕ ПРОЕКТА: в оба языка залит РУССКИЙ текст. Замена на
// английский в англоязычной витрине — задача будущего этапа, а не пропуск.

export type PatientsTableUi = {
  tableTitle: string
  searchPlaceholder: string
  search: string
  reset: string
  loading: string
  empty: string
  emptySearch: string
  colPerson: string
  colVisits: string
  colLastVisit: string
  colAhead: string
  colSpent: string
  /** Подпись входа в карточку: и заголовок колонки, и `aria-label` кнопки. */
  openCard: string
  /** Человек снял согласие: ему писать нельзя. */
  noConsent: string
  /** Визитов в истории нет вовсе. */
  never: string
  /** Записи вперёд нет. */
  noAhead: string
  openTask: string
  count: string
  found: string
  perPage: string
  pageOf: string
  first: string
  prev: string
  next: string
  last: string
  failed: string
  forbidden: string
  unreachable: string
}

const RU: PatientsTableUi = {
  tableTitle: "База людей",
  searchPlaceholder: "Имя или телефон",
  search: "Найти",
  reset: "Сбросить",
  loading: "Читаем базу…",
  empty: "В базе пока никого нет. Данные приходят синхронизацией с CRM.",
  emptySearch: "По этому запросу никого не нашлось.",
  colPerson: "Человек",
  colVisits: "Визитов",
  colLastVisit: "Последний визит",
  colAhead: "Записан вперёд",
  colSpent: "Потрачено",
  openCard: "Открыть карточку",
  noConsent: "не писать",
  never: "не был",
  noAhead: "нет",
  openTask: "открытая задача",
  count: "Всего людей: {count}",
  found: "Найдено: {count}",
  perPage: "Строк",
  pageOf: "страница {page} из {pages}",
  first: "В начало",
  prev: "Назад",
  next: "Вперёд",
  last: "В конец",
  failed: "Не удалось прочитать базу.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",
}

const DICT: Record<string, PatientsTableUi> = { en: RU, ru: RU }

export function patientsTableUi(lang: string): PatientsTableUi {
  return DICT[lang] ?? DICT.en
}
