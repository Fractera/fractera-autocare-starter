import { readFileSync, writeFileSync, renameSync } from "fs"
import { getAppConfig, getConfigPath } from "@/config/app-config"

// ДАННЫЕ УЧРЕЖДЕНИЯ — чтение и ТОЧЕЧНАЯ запись трёх значений `APP-CONFIG`.
//
// 🔒 ЭТО ПЕРВЫЙ ПИСАТЕЛЬ КОНФИГА В ПРИЛОЖЕНИИ, И ЭТО РЕШЕНИЕ ВЛАДЕЛЬЦА
// (Рома, 2026-08-25, шаг 22). Закон архитектуры говорит «панель пишет, приложение
// читает», и до сих пор `config/app-config.ts` умел только `readFileSync`. Отступление
// принято сознательно: правит АДМИНИСТРАТОР КЛИНИКИ, а панель Fractera — рабочее место
// владельца сервера, и пускать туда персонал ради названия компании неправильно.
//
// 🔒 ЦЕНА ОТСТУПЛЕНИЯ НАЗВАНА ВСЛУХ: у файла теперь ДВА писателя. Панель ведёт свой
// журнал и о нашей правке не знает — сохранение отсюда может быть перекрыто сохранением
// оттуда, и наоборот. Экран обязан это сказать человеку; молча — значит однажды объявить
// пропажу настройки поломкой.
//
// 🔒 ПИШЕМ ТРИ ЗНАЧЕНИЯ, А НЕ ОБЪЕКТ ЦЕЛИКОМ. Файл несёт только то, что владелец менял;
// записав сюда весь слитый с умолчаниями конфиг, мы превратили бы его умолчания в его
// решения — и первая же смена умолчания в шаблоне перестала бы доезжать до проекта.
// Поэтому читается СЫРОЙ файл, правятся три ветки, остальное кладётся обратно как было.

export type CompanySettings = {
  /** Полное название учреждения — идёт в заголовки и разметку для машин. */
  name: string
  /** Короткое название — им подписан подвал сайта. */
  shortName: string
  /** Контактный телефон учреждения; пустая строка означает «не указан». */
  phone: string
  /** Адрес логотипа в медиахранилище; пусто — не задан. */
  logo: string
  /**
   * Адрес фавикона. 🔒 ОТДЕЛЬНОЕ ПОЛЕ, И РОМА ПРАВ, ЧТО ЗАСОМНЕВАЛСЯ (2026-08-25).
   * Логотип и фавикон — разные картинки по существу: первый читается в ширину, второй
   * виден размером 16 пикселей, где от логотипа остаётся пятно. Пусто — берётся логотип:
   * лучше пятно, чем пустая вкладка.
   */
  favicon: string
}

export type SaveResult = { ok: true; settings: CompanySettings } | { ok: false; error: string; field?: keyof CompanySettings }

const LIMITS = { name: 120, shortName: 60, phone: 40, logo: 500, favicon: 500 } as const

// 🔒 ТЕЛЕФОН НЕ ПРИВОДИТСЯ К ФОРМАТУ. Клиника пишет его так, как отвечает по нему
// человек: «+7 928 000-00-00» и «8 (87937) 5-00-00» — оба верны, и выбор между ними не
// наш. Проверяется только то, что строка СОСТОИТ из знаков телефона: буквы здесь
// означают, что в поле попало не то.
const PHONE_ALLOWED = /^[0-9+(). -]*$/

function fail(error: string, field?: keyof CompanySettings): SaveResult {
  return { ok: false, error, field }
}

/** Что показывает форма: ЭФФЕКТИВНЫЕ значения — то же, что видит посетитель сайта. */
export function readCompanySettings(): CompanySettings {
  const cfg = getAppConfig()
  return {
    name: cfg.name ?? "",
    shortName: cfg.short_name ?? "",
    phone: cfg.geo?.phone ?? "",
    logo: cfg.logo ?? "",
    favicon: cfg.icons?.faviconAny ?? "",
  }
}

function validate(input: Partial<CompanySettings>): SaveResult {
  const name = String(input.name ?? "").trim()
  const shortName = String(input.shortName ?? "").trim()
  const phone = String(input.phone ?? "").trim()
  const logo = String(input.logo ?? "").trim()
  const favicon = String(input.favicon ?? "").trim()

  if (!name) return fail("empty", "name")
  if (name.length > LIMITS.name) return fail("tooLong", "name")
  if (!shortName) return fail("empty", "shortName")
  if (shortName.length > LIMITS.shortName) return fail("tooLong", "shortName")
  if (phone.length > LIMITS.phone) return fail("tooLong", "phone")
  if (!PHONE_ALLOWED.test(phone)) return fail("badPhone", "phone")
  if (logo.length > LIMITS.logo) return fail("tooLong", "logo")
  if (favicon.length > LIMITS.favicon) return fail("tooLong", "favicon")

  return { ok: true, settings: { name, shortName, phone, logo, favicon } }
}

/**
 * Записать три значения в `APP-CONFIG/app-config.json`.
 *
 * 🔒 ЗАПИСЬ ЧЕРЕЗ ВРЕМЕННЫЙ ФАЙЛ И ПЕРЕИМЕНОВАНИЕ. Прямая запись поверх оставляет окно,
 * в котором конфиг существует наполовину, — а читают его КАЖДЫМ запросом страницы.
 * Обрыв в этот миг стоил бы не правки, а всего файла настроек.
 *
 * 🔒 ПЕРЕВОД СТРОКИ — LF, и это не косметика (оплачено шагом 21): дерево объявлено
 * `* text=auto eol=lf`, а порождённые конфиги сравниваются побайтно. Файл, записанный с
 * CRLF, уронил бы сборку на сервере.
 */
export function writeCompanySettings(input: Partial<CompanySettings>): SaveResult {
  const checked = validate(input)
  if (!checked.ok) return checked
  const { name, shortName, phone, logo, favicon } = checked.settings

  const path = getConfigPath()
  let raw: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"))
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>
  } catch {
    // Файла нет или он испорчен — начинаем с пустого объекта. Умолчания шаблона при
    // этом никуда не деваются: их подставит `getAppConfig` при следующем чтении.
    raw = {}
  }

  const geoBefore = raw.geo
  const geo: Record<string, unknown> =
    geoBefore && typeof geoBefore === "object" && !Array.isArray(geoBefore)
      ? { ...(geoBefore as Record<string, unknown>) }
      : {}
  // Пустой телефон — это «не указан», а не пустая строка в разметке: ключ убирается.
  if (phone) geo.phone = phone
  else delete geo.phone


  // 🔒 КАРТИНКИ ПРАВЯТСЯ ТОЧЕЧНО, КАК И ВСЁ ОСТАЛЬНОЕ. В ветке images живут ещё обложка и
  // картинка для соцсетей, а рядом — целый набор иконок; их настраивает владелец в панели,
  // и записать сюда объект целиком значило бы стереть его работу правкой телефона.
  //
  // 🔒 ЛОГОТИП И ИКОНКИ ЛЕЖАТ В РАЗНЫХ ВЕТКАХ, и это проверено по типу конфига, а не
  // угадано: `logo` — своё поле верхнего уровня, `icons` — своё. Первая редакция клала
  // иконки внутрь images, и компилятор это поймал.
  const imagesBefore = raw.images
  const images: Record<string, unknown> =
    imagesBefore && typeof imagesBefore === "object" && !Array.isArray(imagesBefore)
      ? { ...(imagesBefore as Record<string, unknown>) }
      : {}

  const iconsBefore = raw.icons
  const icons: Record<string, unknown> =
    iconsBefore && typeof iconsBefore === "object" && !Array.isArray(iconsBefore)
      ? { ...(iconsBefore as Record<string, unknown>) }
      : {}
  // 🔒 ФАВИКОН ПАДАЕТ НА ЛОГОТИП, А НЕ ИСЧЕЗАЕТ. Не задан отдельно — вкладка получает
  // логотип: пятно в шестнадцать пикселей лучше пустого квадрата браузера по умолчанию.
  const faviconValue = favicon || logo
  if (faviconValue) icons.faviconAny = faviconValue
  else delete icons.faviconAny


  const next: Record<string, unknown> = { ...raw, name, short_name: shortName, geo, images }
  if (logo) next.logo = logo
  else delete next.logo
  if (Object.keys(icons).length) next.icons = icons
  else delete next.icons

  const tmp = `${path}.tmp`
  try {
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8")
    renameSync(tmp, path)
  } catch (e) {
    return fail(String((e as Error).message ?? e))
  }

  return { ok: true, settings: { name, shortName, phone, logo, favicon } }
}

