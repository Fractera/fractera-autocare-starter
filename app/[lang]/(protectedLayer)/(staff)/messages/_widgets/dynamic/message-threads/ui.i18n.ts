// Слова виджета «переписка». 🔒 Два языка вместо десяти — записанный долг;
// временное упрощение проекта: в оба залит русский текст.

export type MessageThreadsUi = {
  loading: string
  failed: string
  forbidden: string
  unreachable: string

  empty: string
  emptyHint: string
  emptyThread: string

  sumThreads: string
  sumMessages: string
  sumUnknown: string
  sumAi: string

  unknownNumber: string
  /** Пометка ветки, посеянной для показа интерфейса. */
  demoBadge: string
  /** Кнопка: посеять демонстрацию. */
  /** Подсказка в поле ввода. */
  writeHere: string
  /** Пометка под исходящим: наружу не ушло. */
  notDelivered: string
  /** Принято службой, но доставка ещё не подтверждена. */
  accepted: string
  /** Выбор канала над полем ввода. */
  channelAuto: string
  channelWhatsapp: string
  channelTelegram: string
  channelHint: string
  /** Пометка на сообщении в ТЕСТОВОЙ ветке: доставки здесь не бывает по устройству. */
  testMessage: string
  /** Строка над лентой тестовой ветки. */
  demoThreadNotice: string
  /** Объяснение пометки целиком, один раз над лентой. */
  channelOff: string
  /** Пациент набирает ответ. */
  typing: string
  /** Кнопка прикрепить файл любого принимаемого типа. */
  attach: string
  /** Заголовок меню вложений: что можно приложить и сколько. */
  attachHint: string
  /** Кнопка снять прикреплённый файл. */
  removeAttachment: string
  /** Картинка загружается в хранилище. */
  uploading: string
  /** Отказ: файлов больше предела. */
  tooManyFiles: string
  /** Отказ: файл тяжелее предела. */
  fileTooBig: string
  /** Отказ: тип файла не принимается. */
  badFileType: string
  /** Подпись вложения в ленте, когда у файла нет имени. */
  imageAlt: string
  /** Картинку не удалось положить в хранилище. */
  uploadFailed: string
  demoOn: string
  /** Кнопка: убрать демонстрацию. */
  demoOff: string
  /** Плашка над списком, когда демонстрационные ветки есть. */
  demoNotice: string
  /** Предупреждение над лентой ЖИВОГО пациента. */
  liveThreadNotice: string
  /** Тестового юзера не создали. */
  noTestUser: string
  unknownNumberHint: string
  noConsent: string
  incoming: string
  outgoing: string
  aiGenerated: string
  /** Кто отправил: три источника исходящего. */
  byManager: string
  byAi: string
  byTimer: string
  openCard: string
  back: string
  threadOf: string
}

const RU: MessageThreadsUi = {
  loading: "Читаем переписку…",
  failed: "Не удалось прочитать переписку.",
  forbidden: "Этот раздел доступен сотрудникам учреждения.",
  unreachable: "Слой данных не ответил.",

  empty: "Переписки ещё нет",
  emptyHint: "Сообщения приходят через канал связи, и он пока не подключён. Когда подключится, здесь появятся ветки — по одной на номер телефона, включая номера, которых нет в базе.",
  emptyThread: "В этой ветке нет сообщений.",

  sumThreads: "веток",
  sumMessages: "сообщений",
  sumUnknown: "номеров без карточки",
  sumAi: "ответила модель",

  unknownNumber: "номера нет в базе",
  demoBadge: "тестовый",
  writeHere: "Напишите сообщение…",
  notDelivered: "не доставлено",
  accepted: "принято службой",
  channelAuto: "Авто",
  channelWhatsapp: "WhatsApp",
  channelTelegram: "Telegram",
  channelHint: "Авто — служба выберет живой канал сама. Жёсткий выбор уйдёт только тем каналом и не дойдёт, если он не поднят.",
  testMessage: "тестовый юзер",
  demoThreadNotice: "Ветка тестового юзера: сообщения уходят по-настоящему, но на ваш собственный номер. Здесь можно писать что угодно.",
  liveThreadNotice: "⚠️ Это ЖИВОЙ пациент. Каждое отправленное сообщение уйдёт ему в мессенджер и отозвать его будет нельзя.",
  noTestUser: "Тестового юзера ещё нет. Заведите его в настройках компании — там же, где вписывается тестовый номер.",
  channelOff: "Канал отправки не подключён: сообщение сохраняется в переписке, но пациенту не уходит. Доставка появится вместе с ядром — два таймера и отправка через ChatPush.",
  typing: "печатает…",
  attach: "Прикрепить файл",
  attachHint: "Изображение, видео, аудио или документ · до 3 файлов, 25 МБ",
  removeAttachment: "Убрать",
  uploading: "Загружаю файл…",
  tooManyFiles: "К одному сообщению можно приложить не больше трёх файлов.",
  fileTooBig: "Файл тяжелее 25 МБ — такой не примем.",
  badFileType: "Такой тип файла не принимается.",
  imageAlt: "Вложение сообщения",
  uploadFailed: "Не удалось загрузить файл в хранилище.",
  demoOn: "Сообщения с тестовым юзером",
  demoOff: "К списку веток",
  demoNotice: "В списке есть ветка тестового юзера — по ней проверяют канал. Сообщения в ней уходят НАСТОЯЩИЕ, но на номер, который вы сами вписали в настройках компании.",
  unknownNumberHint: "Человек написал с номера, которого нет ни в одной карточке. Такие ветки видны намеренно: это живое обращение, и разобрать его должен человек.",
  noConsent: "не писать",
  incoming: "входящее",
  outgoing: "исходящее",
  aiGenerated: "написала модель",
  byManager: "менеджер",
  byAi: "автоответ ИИ",
  byTimer: "по расписанию",
  openCard: "Карточка",
  back: "Ко всем веткам",
  threadOf: "Разговор с",
}

const DICT: Record<string, MessageThreadsUi> = { en: RU, ru: RU }

export function messageThreadsUi(lang: string): MessageThreadsUi {
  return DICT[lang] ?? DICT.en
}
