// Слова виджета «карточка человека» — СВОИ, не общие с таблицей списка.
// У списка и карточки разный предмет: там «кто есть и в каком состоянии», здесь
// «что с этим человеком происходило».
//
// 🔒 ДВА ЯЗЫКА ВМЕСТО ДЕСЯТИ — записанный долг (решение владельца 2026-08-21).
// 🔒 Временное упрощение проекта: в оба языка залит РУССКИЙ текст.

export type PersonCardUi = {
  loading: string
  notFound: string
  notFoundHint: string
  back: string

  contacts: string
  phone: string
  email: string
  birthday: string
  consentYes: string
  consentNo: string
  consentNoHint: string
  note: string
  noNote: string
  crmId: string

  summary: string
  visits: string
  serviceLines: string
  spent: string
  lastVisit: string
  nextVisit: string
  cameCount: string
  missedCount: string
  never: string
  none: string

  history: string
  colDate: string
  colService: string
  colDoctor: string
  colCost: string
  colCame: string
  came: string
  missed: string
  unknown: string
  noService: string
  emptyHistory: string

  failed: string
  forbidden: string
  unreachable: string
}

const RU: PersonCardUi = {
  loading: "Читаем карточку…",
  notFound: "Такого человека в базе нет",
  notFoundHint: "Возможно, адрес открыт по старой ссылке, а строку убрали.",
  back: "Ко всем людям",

  contacts: "Связь",
  phone: "Телефон",
  email: "Почта",
  birthday: "Дата рождения",
  consentYes: "Согласие на связь есть",
  consentNo: "Писать нельзя",
  consentNoHint: "Человек отказался от сообщений. Рассылки его не касаются.",
  note: "Заметка",
  noNote: "Заметок нет",
  crmId: "Карточка в CRM",

  summary: "Итог",
  visits: "Визитов",
  serviceLines: "Строк услуг",
  spent: "Потрачено",
  lastVisit: "Последний визит",
  nextVisit: "Записан вперёд",
  cameCount: "Пришёл",
  missedCount: "Не пришёл",
  never: "не был",
  none: "нет",

  history: "История визитов",
  colDate: "Дата",
  colService: "Услуга",
  colDoctor: "Врач",
  colCost: "Стоимость",
  colCame: "Явка",
  came: "пришёл",
  missed: "не пришёл",
  unknown: "неизвестно",
  noService: "услуга не указана",
  emptyHistory: "Визитов за окно выгрузки нет.",

  failed: "Не удалось прочитать карточку.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",
}

const DICT: Record<string, PersonCardUi> = { en: RU, ru: RU }

export function personCardUi(lang: string): PersonCardUi {
  return DICT[lang] ?? DICT.en
}
