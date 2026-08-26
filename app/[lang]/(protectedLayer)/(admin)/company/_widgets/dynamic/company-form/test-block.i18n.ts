// Слова блока «Мессенджеры для тестовых сообщений» (шаг 30, заказ Ромы 2026-08-25).

export type TestBlockUi = {
  title: string
  subtitle: string
  whatsappLabel: string
  telegramLabel: string
  numberHint: string
  createTitle: string
  createHint: string
  create: string
  creating: string
  created: string
  remove: string
  exists: string
  errNoPhone: string
  errExists: string
  errNoSource: string
  failed: string
}

const DICT: Record<string, TestBlockUi> = {
  en: {
    title: "Messengers for test messages",
    subtitle: "Real messages go to these numbers when you check the channel. They are not a secret and are shown openly.",
    whatsappLabel: "Test WhatsApp",
    telegramLabel: "Test Telegram",
    numberHint: "A number you can read yourself — that is the whole point of the check.",
    createTitle: "Test client",
    createHint: "Copies the visit history of one of the most valuable clients onto the test number, under an obviously test name. Screens, rules and analytics then work on a life-like history instead of invented round numbers.",
    create: "Create the test client",
    creating: "Creating…",
    created: "Created",
    remove: "Remove test data",
    exists: "A test client already exists",
    errNoPhone: "Enter a test number first.",
    errExists: "Someone already has this number.",
    errNoSource: "There is nobody to copy from: no visit history in the base yet.",
    failed: "Could not create the test client.",
  },
  ru: {
    title: "Мессенджеры для тестовых сообщений",
    subtitle: "На эти номера уходят НАСТОЯЩИЕ сообщения при проверке канала. Это не секрет, поэтому показаны открыто.",
    whatsappLabel: "Тестовый WhatsApp",
    telegramLabel: "Тестовый Telegram",
    numberHint: "Номер, который вы можете прочитать сами, — в этом весь смысл проверки.",
    createTitle: "Тестовый клиент",
    createHint: "Копирует историю визитов одного из самых ценных клиентов на тестовый номер под явно тестовым именем. Тогда экраны, правила и аналитика работают на живой истории, а не на выдуманных ровных числах.",
    create: "Создать тестового клиента",
    creating: "Создаю…",
    created: "Создан",
    remove: "Убрать тестовые данные",
    exists: "Тестовый клиент уже создан",
    errNoPhone: "Сначала впишите тестовый номер.",
    errExists: "Такой номер уже есть у кого-то в базе.",
    errNoSource: "Копировать не с кого: в базе ещё нет истории визитов.",
    failed: "Не удалось создать тестового клиента.",
  },
}

export function testBlockUi(lang: string): TestBlockUi {
  return DICT[lang] ?? DICT.en
}
