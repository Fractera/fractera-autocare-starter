// Слова формы «Данные компании» — живут ВНУТРИ виджета: снеси папку маршрута, и они
// уедут вместе с ним.
//
// 🔒 ДВА ЯЗЫКА — ВКЛЮЧЁННЫЙ НАБОР ПРОЕКТА (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`),
// и это записанный долг, а не дыра: обещание живёт в `development-docs/TRANSLATION-DEBT.md`.

export type CompanyFormUi = {
  nameLabel: string
  nameHint: string
  shortLabel: string
  shortHint: string
  phoneLabel: string
  phoneHint: string
  phonePlaceholder: string
  logoLabel: string
  logoHint: string
  faviconLabel: string
  faviconHint: string
  upload: string
  uploading: string
  remove: string
  uploadFailed: string
  panelFooter: string
  panelLink: string
  save: string
  saving: string
  saved: string
  reset: string
  panelWarning: string
  errEmpty: string
  errTooLong: string
  errBadPhone: string
  forbidden: string
  failed: string
  unreachable: string
}

const DICT: Record<string, CompanyFormUi> = {
  en: {
    nameLabel: "Company name",
    nameHint: "The full name. Goes into page titles and the markup search engines read.",
    shortLabel: "Short name",
    shortHint: "Signs the footer of every page.",
    phoneLabel: "Contact phone",
    phoneHint: "Written the way a person answers it. Leave empty if there is none.",
    phonePlaceholder: "+7 928 000-00-00",
    logoLabel: "Logo",
    logoHint: "Shown wherever the company is presented. A wide image reads best.",
    faviconLabel: "Browser tab icon",
    faviconHint: "Seen at 16 pixels — a square mark works, a full logo turns into a blob. Empty means the logo is used.",
    upload: "Upload",
    uploading: "Uploading…",
    remove: "Remove",
    uploadFailed: "Could not upload the image.",
    panelFooter: "Everything else — palette, fonts, menus, languages, pages — is configured in the control panel.",
    panelLink: "Open the control panel",
    save: "Save",
    saving: "Saving…",
    saved: "Saved. The site picks it up on the next page load.",
    reset: "Undo changes",
    panelWarning: "These same fields are editable in the control panel. Whoever saves last wins — the panel does not know about a change made here.",
    errEmpty: "The field cannot be empty.",
    errTooLong: "The value is too long.",
    errBadPhone: "A phone number holds digits, spaces, +, brackets and dashes — nothing else.",
    forbidden: "Company details are edited by the administrator.",
    failed: "Could not save.",
    unreachable: "No answer from the server.",
  },
  ru: {
    nameLabel: "Название компании",
    nameHint: "Полное название. Идёт в заголовки страниц и в разметку, которую читают поисковики.",
    shortLabel: "Короткое название",
    shortHint: "Им подписан подвал каждой страницы.",
    phoneLabel: "Контактный телефон",
    phoneHint: "Записывается так, как по нему отвечает человек. Нет телефона — оставьте пустым.",
    phonePlaceholder: "+7 928 000-00-00",
    logoLabel: "Логотип",
    logoHint: "Показывается везде, где представлена компания. Лучше читается широкая картинка.",
    faviconLabel: "Значок вкладки браузера",
    faviconHint: "Виден размером 16 пикселей: подойдёт квадратный знак, целый логотип превратится в пятно. Пусто — возьмём логотип.",
    upload: "Загрузить",
    uploading: "Загружаю…",
    remove: "Убрать",
    uploadFailed: "Не удалось загрузить картинку.",
    panelFooter: "Всё остальное — палитра, шрифты, меню, языки, страницы — настраивается в панели управления.",
    panelLink: "Открыть панель управления",
    save: "Сохранить",
    saving: "Сохраняю…",
    saved: "Сохранено. Сайт покажет новое значение при следующей загрузке страницы.",
    reset: "Вернуть как было",
    panelWarning: "Эти же поля правятся в панели управления. Побеждает тот, кто сохранил последним: панель о правке, сделанной здесь, не знает.",
    errEmpty: "Поле не может быть пустым.",
    errTooLong: "Слишком длинное значение.",
    errBadPhone: "В телефоне бывают цифры, пробелы, плюс, скобки и дефисы — больше ничего.",
    forbidden: "Данные компании правит администратор.",
    failed: "Не удалось сохранить.",
    unreachable: "Сервер не ответил.",
  },
}

export function companyFormUi(lang: string): CompanyFormUi {
  return DICT[lang] ?? DICT.en
}
