// Слова виджета ПАСПОРТА: ожидание и четыре отказа.
//
// 🔒 ЧЕТЫРЕ ОТКАЗА, А НЕ ОДИН «ЧТО-ТО ПОШЛО НЕ ТАК». Каждый называет РАЗНУЮ
// причину и разное следующее действие человека: войти · попросить роль ·
// сообщить, что файла нет · перезагрузить. Одно общее сообщение экономит четыре
// строки и стоит человеку часа догадок.
//
// Два языка — включённый набор проекта; обещание в `TRANSLATION-DEBT.md`.

export type PassportViewUi = {
  loading: string
  /** 401 — сессии нет. Дверь ответила «Unauthorized». */
  unauthorized: string
  /** 403 — вошёл, но не архитектор. Дверь назвала требуемую роль. */
  forbidden: string
  /** 404 — файла паспорта нет на диске. Это поломка, а не пустота. */
  missing: string
  /** Всё остальное: сеть, 500. */
  failed: string
  retry: string
}

const DICT: Record<string, PassportViewUi> = {
  en: {
    loading: "Loading the passport…",
    unauthorized: "You are not signed in. The passport is available to the architect of this deployment.",
    forbidden: "Signed in, but this document requires the architect role.",
    missing: "development-docs/PASSPORT.md is not on the server. The page is fine; the file is missing.",
    failed: "The passport could not be loaded.",
    retry: "Try again",
  },
  ru: {
    loading: "Загружаю паспорт…",
    unauthorized: "Вы не вошли. Паспорт доступен архитектору этого развёртывания.",
    forbidden: "Вы вошли, но этот документ требует роли архитектора.",
    missing: "Файла development-docs/PASSPORT.md нет на сервере. Страница цела, отсутствует файл.",
    failed: "Не удалось загрузить паспорт.",
    retry: "Повторить",
  },
}

export function passportViewUi(lang: string): PassportViewUi {
  return DICT[lang] ?? DICT.en
}
