// Слова виджета «каталог услуг». 🔒 Два языка вместо десяти — записанный долг;
// временное упрощение проекта: в оба залит русский текст.

export type ServiceCatalogueUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string

  empty: string
  emptyHint: string
  emptySearch: string

  search: string
  searchPlaceholder: string
  reset: string
  allCategories: string

  sumTotal: string
  sumWithProtocol: string
  sumCourses: string
  sumExcluded: string
  sumUncategorised: string
  protocolDebt: string

  colService: string
  colVisits: string
  colPeople: string
  colRevenue: string
  colLast: string

  course: string
  excluded: string
  noProtocol: string
  hasProtocol: string

  edit: string
  save: string
  cancel: string
  saved: string
  fCategory: string
  fProtocol: string
  fProtocolHint: string
  fCourse: string
  fCourseHint: string
  fExcluded: string
  fExcludedHint: string
  titleLocked: string
}

const RU: ServiceCatalogueUi = {
  loading: "Читаем каталог…",
  failed: "Не удалось прочитать каталог.",
  forbidden: "Править каталог может только администратор.",
  unreachable: "Слой данных не ответил.",

  empty: "Каталог пуст",
  emptyHint: "Услуги заводит синхронизация из того, что реально оказывали. Пока визитов нет, каталогу неоткуда взяться.",
  emptySearch: "По этому запросу ничего не нашлось.",

  search: "Найти",
  searchPlaceholder: "Название услуги",
  reset: "Сбросить",
  allCategories: "Все разделы",

  sumTotal: "услуг в каталоге",
  sumWithProtocol: "с протоколом",
  sumCourses: "курсовых",
  sumExcluded: "исключено из счёта",
  sumUncategorised: "без раздела",
  protocolDebt: "🔴 Протокол не написан ни к одной услуге. Пока его нет, оператору нечего сказать человеку сверх «приходите».",

  colService: "Услуга",
  colVisits: "Оказано",
  colPeople: "Людей",
  colRevenue: "Выручка",
  colLast: "Последний раз",

  course: "курс",
  excluded: "не в счёт",
  noProtocol: "нет протокола",
  hasProtocol: "протокол есть",

  edit: "Править",
  save: "Сохранить",
  cancel: "Отмена",
  saved: "Услуга сохранена",
  fCategory: "Раздел",
  fProtocol: "Протокол сопровождения",
  fProtocolHint: "Что говорить человеку после этой услуги: когда ждать эффект, когда прийти снова, чего избегать.",
  fCourse: "Курсовая процедура",
  fCourseHint: "Делается курсом, а не разово. По этому признаку сегмент находит тех, кто бросил курс на середине.",
  fExcluded: "Не учитывать в счёте",
  fExcludedHint: "Услуга не попадёт в аналитику и в меру правил. Для разовых и служебных позиций.",
  titleLocked: "Название приходит из CRM и здесь не меняется: по нему услуга связана со всеми своими визитами.",
}

const DICT: Record<string, ServiceCatalogueUi> = { en: RU, ru: RU }

export function serviceCatalogueUi(lang: string): ServiceCatalogueUi {
  return DICT[lang] ?? DICT.en
}
