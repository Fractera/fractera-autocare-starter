// Слова виджета «аудит базы».
//
// 🔒 КАЖДОЕ ЧИСЛО ЗДЕСЬ ИДЁТ С ОБЪЯСНЕНИЕМ, И ЭТО НЕ УКРАШЕНИЕ. Экран отвечает
// на вопрос «можно ли доверять цифрам»; голое число без слов сообщает ровно
// столько же, сколько его отсутствие. ✗ Именно так «984» полдня жило в отчёте
// шага 11, ничего никому не говоря.
//
// 🔒 Два языка вместо десяти — записанный долг. Временное упрощение проекта:
// в оба языка залит РУССКИЙ текст.

export type BaseAuditUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string

  sizeTitle: string
  people: string
  peopleHint: string
  visitRows: string
  visitRowsHint: string
  crmRecords: string
  crmRecordsHint: string

  gapsTitle: string
  visitsWithoutPerson: string
  visitsWithoutPersonHint: string
  neverVisited: string
  neverVisitedHint: string
  visitsWithoutService: string
  visitsWithoutServiceHint: string

  crmTitle: string
  notMeasured: string
  consentUnknown: string
  consentUnknownHint: string
  birthdayUnknown: string
  birthdayUnknownHint: string
  withoutConsent: string
  withoutConsentHint: string
  withoutBirthday: string
  withoutBirthdayHint: string

  syncTitle: string
  noSync: string
  noSyncHint: string
  syncAt: string
  syncBy: string
  clients: string
  clientsHint: string
  skippedNoPhone: string
  skippedNoPhoneHint: string
  mergedByPhone: string
  mergedByPhoneHint: string
  reconcile: string
  reconcileOk: string
  reconcileBad: string
}

const RU: BaseAuditUi = {
  loading: "Считаем базу…",
  failed: "Не удалось посчитать базу.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",

  sizeTitle: "Сколько всего",
  people: "Людей",
  peopleHint: "Карточки, у которых разобран телефон: только им можно написать.",
  visitRows: "Строк визитов",
  visitRowsHint: "Строка — одна услуга. Приём с двумя услугами даёт две строки.",
  crmRecords: "Записей CRM",
  crmRecordsHint: "Приёмов в окне выгрузки: два года назад и 90 дней вперёд.",

  gapsTitle: "Где база дырявая",
  visitsWithoutPerson: "Визитов без человека",
  visitsWithoutPersonHint:
    "Приёмы, за которыми не стоит карточка. Деньги посчитаны, а позвать человека снова невозможно — некому. Это не наша потеря и не ошибка выгрузки: так эти приёмы записаны в CRM.",
  neverVisited: "Людей без единого визита",
  neverVisitedHint: "Карточка есть, приёмов в окне выгрузки нет. Либо давний клиент, либо заведён и не дошёл.",
  visitsWithoutService: "Строк без названия услуги",
  visitsWithoutServiceHint: "Приём состоялся, что делали — не записано. Выручка считается, разбор по услугам — нет.",

  crmTitle: "Чего CRM не отдаёт",
  notMeasured: "не измерено",
  consentUnknown: "Согласие на связь",
  consentUnknownHint:
    "CRM не прислала поле ни по одной карточке. Поэтому «отказников 0» — НЕ факт о людях: мы просто не знаем, кто отказался. До починки любая рассылка идёт вслепую.",
  birthdayUnknown: "Дата рождения",
  birthdayUnknownHint:
    "CRM не прислала поле ни по одной карточке. Цепочка «поздравление с днём рождения» не сможет сработать ни разу.",
  withoutConsent: "Отказались от сообщений",
  withoutConsentHint: "Этих людей рассылки не касаются.",
  withoutBirthday: "Без даты рождения",
  withoutBirthdayHint: "Поздравить не с чем.",

  syncTitle: "Последний перенос из CRM",
  noSync: "Переносов ещё не было",
  noSyncHint: "База наполняется синхронизацией. Пока её не запускали, считать нечего.",
  syncAt: "Когда",
  syncBy: "Кто запустил",
  clients: "Карточек в CRM",
  clientsHint: "Столько отдала CRM на последнем прогоне.",
  skippedNoPhone: "Пропущено без телефона",
  skippedNoPhoneHint: "Телефон — и ключ уникальности, и единственный способ достучаться. Без него карточка не становится человеком продукта.",
  mergedByPhone: "Схлопнуто по телефону",
  mergedByPhoneHint: "Две карточки CRM на один номер — один человек. Строка одна, и это правильно; в CRM это дубль, который стоит свести руками.",
  reconcile: "Сходится ли с CRM",
  reconcileOk: "сходится: {clients} − {skipped} − {merged} = {people}",
  reconcileBad: "НЕ сходится: {clients} − {skipped} − {merged} ≠ {people}. Числа разошлись — доверять отчётам нельзя, пока причина не найдена.",
}

const DICT: Record<string, BaseAuditUi> = { en: RU, ru: RU }

export function baseAuditUi(lang: string): BaseAuditUi {
  return DICT[lang] ?? DICT.en
}
