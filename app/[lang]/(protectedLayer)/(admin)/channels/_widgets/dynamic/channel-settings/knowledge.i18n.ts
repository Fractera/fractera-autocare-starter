// Слова блока «База знаний компании» (шаг 33).

export type KnowledgeUi = {
  title: string
  subtitle: string
  add: string
  adding: string
  costWarning: string
  formatHint: string
  empty: string
  building: string
  inGraph: string
  failed: string
  remove: string
  removing: string
  engineDown: string
  errBadType: string
  errEmpty: string
  errRefused: string
  accepted: string
  acceptedHint: string
}

const RU: KnowledgeUi = {
  title: "База знаний компании",
  subtitle: "Что модель знает о клинике сверх карточек и визитов: протоколы, прайс, противопоказания, правила приёма.",
  add: "Добавить документы",
  adding: "Загружаю…",
  costWarning: "Каждый документ модель читает ЦЕЛИКОМ, чтобы вытащить сущности и связи. Это самая дорогая операция продукта, и платится она один раз за документ. Загружайте то, о чём действительно будут спрашивать, а не архив целиком.",
  formatHint: "Принимаются .txt и .md. Другой формат — переведите его в Markdown любым конвертером в интернете и принесите снова: разбирать PDF и Word мы не умеем, а принять их значило бы положить в базу знаний служебный мусор вместо текста.",
  empty: "Пока ничего не загружено.",
  building: "строится граф",
  inGraph: "в графе",
  failed: "не удалось обработать",
  remove: "Убрать",
  removing: "Убираю…",
  engineDown: "Служба знаний не отвечает. Загрузка сейчас невозможна — документы никуда не денутся, попробуйте позже.",
  errBadType: "Такой формат мы не читаем. Переведите файл в Markdown и принесите снова.",
  errEmpty: "Файл пустой.",
  errRefused: "Служба знаний отказалась принять документ.",
  accepted: "Документ принят",
  acceptedHint: "Граф строится в фоне — это занимает время. Пока идёт стройка, вопросы по этому документу будут отвечаться пустотой, и это нормально.",
}

const DICT: Record<string, KnowledgeUi> = { en: RU, ru: RU }

export function knowledgeUi(lang: string): KnowledgeUi {
  return DICT[lang] ?? DICT.en
}
