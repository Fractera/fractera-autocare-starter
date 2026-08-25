// Слова виджета «кандидаты в VIP». 🔒 Два языка вместо десяти — записанный долг;
// временное упрощение проекта: в оба залит русский текст.

export type VipCandidatesUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string
  empty: string
  emptyHint: string

  howTitle: string
  howText: string
  linkStat: string
  toAccounts: string

  colPerson: string
  colVisits: string
  colRevenue: string
  colLast: string
  colEmail: string
  noEmail: string
  noEmailHint: string
  noConsent: string
  never: string
}

const RU: VipCandidatesUi = {
  loading: "Считаем ценность…",
  failed: "Не удалось прочитать список.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",
  empty: "Считать пока нечего",
  emptyHint: "Ценность считается по истории визитов. Пока синхронизация не привезла данные, ранжировать некого.",

  howTitle: "Как назначить VIP",
  howText: "Роль живёт в учётных записях, а не здесь: человек в CRM и учётная запись на сайте — разные вещи, и связать их можно только по почте. Этот экран отвечает, КОМУ давать роль; сама выдача — на странице учётных записей.",
  linkStat: "Почта известна у {n} человек из {total} — остальных сопоставить с учётной записью не по чему.",
  toAccounts: "Учётные записи",

  colPerson: "Человек",
  colVisits: "Приёмов",
  colRevenue: "Принёс",
  colLast: "Последний визит",
  colEmail: "Почта",
  noEmail: "нет почты",
  noEmailHint: "Без почты человека невозможно сопоставить с учётной записью.",
  noConsent: "не писать",
  never: "не был",
}

const DICT: Record<string, VipCandidatesUi> = { en: RU, ru: RU }

export function vipCandidatesUi(lang: string): VipCandidatesUi {
  return DICT[lang] ?? DICT.en
}
