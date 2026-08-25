// Слова страницы КАБИНЕТА.
//
// 🔒 ЗАГОЛОВКОВ ДВА, И ВЫБОР МЕЖДУ НИМИ ДЕЛАЕТ РОЛЬ (владелец, 2026-08-25):
// «если пользователь VIP user, значит в личном кабинете должно быть написано
// „личный кабинет клиента компании"; если пользователь не VIP — „личный кабинет
// гостя компании"».
//
// 🔒 ПОЧЕМУ ЗДЕСЬ ОБА, А НЕ ОДИН «ПРАВИЛЬНЫЙ». Роль известна только после
// гидратации: спроси её сервер — и весь защищённый слой уедет из предрендера
// одной строкой. Поэтому сервер отдаёт островку ОБА заголовка, а тот выбирает.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`en,ru`); обещание в
// `development-docs/TRANSLATION-DEBT.md`.

export type CabinetUi = {
  /** Заголовок до ответа службы: нейтральный, без обещания статуса. */
  title: string
  subtitle: string
  /** Заголовок для роли `vip_user` — клиента компании. */
  titleClient: string
  /** Заголовок для всех остальных вошедших — гостя компании. */
  titleGuest: string
}

const DICT: Record<string, CabinetUi> = {
  en: {
    title: "Personal cabinet",
    subtitle: "The cabinet of a clinic's client.",
    titleClient: "Personal cabinet of a company client",
    titleGuest: "Personal cabinet of a company guest",
  },
  ru: {
    title: "Личный кабинет",
    subtitle: "Кабинет клиента учреждения.",
    titleClient: "Личный кабинет клиента компании",
    titleGuest: "Личный кабинет гостя компании",
  },
}

export function cabinetUi(lang: string): CabinetUi {
  return DICT[lang] ?? DICT.en
}
