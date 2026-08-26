// Слова приглашения на главной — для гостя и для каждой вошедшей роли (шаги 27 и 28).
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type HomeCtaUi = {
  /** Гость: кнопка входа. */
  become: string
  hint: string
  /** `user`: заголовок формы заявки и её поля. */
  requestTitle: string
  requestHint: string
  nameLabel: string
  namePlaceholder: string
  emailLabel: string
  emailHint: string
  send: string
  sending: string
  /** Уведомление после отправки. */
  sentTitle: string
  sentBody: string
  toCabinet: string
  /** Заявка уже подана. */
  pendingTitle: string
  pendingBody: string
  /** `manager` / `admin`. */
  toDashboard: string
  dashboardHint: string
  /** `vip_user`. */
  toVip: string
  vipHint: string
  /** Отказы. */
  errEmptyName: string
  errExists: string
  failed: string
}

const DICT: Record<string, HomeCtaUi> = {
  en: {
    become: "Become a client",
    hint: "Sign in or create an account — it takes a minute.",
    requestTitle: "Send a request to become a client",
    requestHint: "A manager will read it and get in touch. Nothing is charged.",
    nameLabel: "Your name",
    namePlaceholder: "First and last name",
    emailLabel: "Email",
    emailHint: "The address you signed up with — the answer comes here.",
    send: "Send the request",
    sending: "Sending…",
    sentTitle: "Your request has been sent",
    sentBody: "A manager will get in touch. The state of the request is on your personal page.",
    toCabinet: "Go to my page",
    pendingTitle: "Your request is with a manager",
    pendingBody: "It is already in the queue — there is no need to send another one.",
    toDashboard: "Go to the dashboard",
    dashboardHint: "The working screens of the clinic: queue, people, analytics.",
    toVip: "Go to my page",
    vipHint: "You are a client of the clinic.",
    errEmptyName: "Please tell us your name.",
    errExists: "You already have a request waiting.",
    failed: "Could not send the request.",
  },
  ru: {
    become: "Стать клиентом",
    hint: "Войдите или заведите учётную запись — это займёт минуту.",
    requestTitle: "Отправить заявку, чтобы стать клиентом",
    requestHint: "Менеджер прочитает её и свяжется с вами. Ничего платить не нужно.",
    nameLabel: "Ваше имя",
    namePlaceholder: "Имя и фамилия",
    emailLabel: "Электронная почта",
    emailHint: "Адрес, с которого вы зарегистрировались, — ответ придёт сюда.",
    send: "Отправить заявку",
    sending: "Отправляю…",
    sentTitle: "Ваш запрос отправлен",
    sentBody: "Менеджер свяжется с вами. Состояние заявки — на вашей личной странице.",
    toCabinet: "Перейти на мою страницу",
    pendingTitle: "Ваша заявка у менеджера",
    pendingBody: "Она уже в очереди — отправлять вторую не нужно.",
    toDashboard: "Перейти в дашборд",
    dashboardHint: "Рабочие экраны клиники: очередь, люди, аналитика.",
    toVip: "Перейти на мою страницу",
    vipHint: "Вы клиент клиники.",
    errEmptyName: "Напишите, пожалуйста, ваше имя.",
    errExists: "У вас уже есть заявка в работе.",
    failed: "Не удалось отправить заявку.",
  },
}

export function homeCtaUi(lang: string): HomeCtaUi {
  return DICT[lang] ?? DICT.en
}
