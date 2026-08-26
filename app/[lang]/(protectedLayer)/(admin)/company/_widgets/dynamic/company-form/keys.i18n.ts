// Слова блока ключей интеграций (шаг 29).
//
// 🔒 У КАЖДОГО КЛЮЧА СКАЗАНО, ЧТО ПЕРЕСТАЁТ РАБОТАТЬ БЕЗ НЕГО. Ключ без объяснения — это
// поле, которое администратор боится трогать: он не знает, что сломает, и не трогает
// ничего. Или, что хуже, стирает наугад.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА; долг записан в `development-docs/TRANSLATION-DEBT.md`.

export type KeysUi = {
  title: string
  subtitle: string
  /** Общее предупреждение о том, что значение не показывается. */
  hidden: string
  set: string
  notSet: string
  fromEnv: string
  placeholder: string
  clear: string
  save: string
  saving: string
  saved: string
  failed: string
  labels: Record<string, { label: string; what: string }>
}

const DICT: Record<string, KeysUi> = {
  en: {
    title: "Integration keys",
    subtitle: "Connect the clinic's own accounts. A saved key works at once — nothing needs restarting.",
    hidden: "A saved key is never shown back — only the last four characters, to recognise it. Leave a field empty to keep the current key.",
    set: "set",
    notSet: "not set",
    fromEnv: "set by the server owner",
    placeholder: "Paste a new key to replace",
    clear: "Clear",
    save: "Save the keys",
    saving: "Saving…",
    saved: "The keys are saved and already in effect.",
    failed: "Could not save the keys.",
    labels: {
      OPENAI_API_KEY: { label: "OpenAI", what: "Without it the model writes nothing: no message texts, no speech transcription." },
      YCLIENTS_PARTNER_TOKEN: { label: "YCLIENTS — partner token", what: "Without it the CRM is unreachable: no people, no visits, no services." },
      YCLIENTS_USER_TOKEN: { label: "YCLIENTS — user token", what: "Goes together with the partner token; one without the other does not open the CRM." },
      CHATPUSH_TOKEN: { label: "ChatPush — sending", what: "Without it messages are stored but never leave: patients receive nothing." },
      CHATPUSH_HOOK_SECRET: { label: "ChatPush — incoming", what: "Without it the door for incoming messages stays shut, and what patients write is lost." },
    },
  },
  ru: {
    title: "Ключи интеграций",
    subtitle: "Подключите собственные учётные записи клиники. Сохранённый ключ действует сразу — перезапускать ничего не нужно.",
    hidden: "Сохранённый ключ обратно не показывается — только последние четыре знака, чтобы его опознать. Оставьте поле пустым, чтобы ключ не менялся.",
    set: "задан",
    notSet: "не задан",
    fromEnv: "задан владельцем сервера",
    placeholder: "Вставьте новый ключ, чтобы заменить",
    clear: "Стереть",
    save: "Сохранить ключи",
    saving: "Сохраняю…",
    saved: "Ключи сохранены и уже действуют.",
    failed: "Не удалось сохранить ключи.",
    labels: {
      OPENAI_API_KEY: { label: "OpenAI", what: "Без него модель ничего не пишет: ни текстов сообщений, ни расшифровки речи." },
      YCLIENTS_PARTNER_TOKEN: { label: "YCLIENTS — партнёрский токен", what: "Без него CRM недоступна: не приедут ни люди, ни визиты, ни услуги." },
      YCLIENTS_USER_TOKEN: { label: "YCLIENTS — пользовательский токен", what: "Идёт в паре с партнёрским; один без другого CRM не открывает." },
      CHATPUSH_TOKEN: { label: "ChatPush — отправка", what: "Без него сообщения сохраняются, но наружу не уходят: пациенты ничего не получают." },
      CHATPUSH_HOOK_SECRET: { label: "ChatPush — приём", what: "Без него дверь для входящих закрыта, и написанное пациентами теряется." },
    },
  },
}

export function keysUi(lang: string): KeysUi {
  return DICT[lang] ?? DICT.en
}
