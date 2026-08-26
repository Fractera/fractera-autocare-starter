import "server-only"
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "fs"
import { join, dirname } from "path"

// КЛЮЧИ ИНТЕГРАЦИЙ — их вводит администратор клиники на своём экране (шаг 29).
//
// 🔒 НЕ В `.env.local`, И ЭТО ТЕХНИЧЕСКОЕ ОГРАНИЧЕНИЕ, А НЕ ВКУС. `process.env` читается
// ОДИН РАЗ при запуске процесса. Запиши ключ в env — и он не действует, пока приложение не
// перезапустят; а перезапустить себя приложение может только убив себя посреди запроса того
// человека, который нажал «Сохранить». Навык `persist-env-var-with-rebuild` называет оба
// случая прямо: build-time требует пересборки, runtime — перезапуска. Ни того, ни другого
// приложение о себе делать не должно.
//
// Поэтому ключи лежат в файле, который читается СВЕЖИМ на каждый запрос — ровно как
// `app-config.json`. Сохранение действует сразу.
//
// 🔒 ПОЧЕМУ `storage/`, И ЭТО ПРОВЕРЕНО, А НЕ ВЫБРАНО НА СЛУХ:
//   ① каталог в `.gitignore` (`storage/*`, кроме `.gitkeep`) — ключи физически не попадут
//      в репозиторий даже случайной командой;
//   ② доставка его НЕ везёт — значит выкладка кода не затрёт ключи на сервере и не увезёт
//      их оттуда на чужую машину.

const FILE = process.env.INTEGRATION_KEYS_PATH ?? join(process.cwd(), "storage", "integration-keys.json")

/**
 * Ключи, которыми владеет администратор.
 *
 * Имя поля совпадает с именем переменной окружения НАМЕРЕННО: так видно, что файл и
 * окружение — два источника одного значения, а не две разные настройки.
 */
export type KeyName =
  | "OPENAI_API_KEY"
  | "YCLIENTS_PARTNER_TOKEN"
  | "YCLIENTS_USER_TOKEN"
  | "CHATPUSH_TOKEN"
  | "CHATPUSH_HOOK_SECRET"

export const KEY_NAMES: readonly KeyName[] = [
  "OPENAI_API_KEY",
  "YCLIENTS_PARTNER_TOKEN",
  "YCLIENTS_USER_TOKEN",
  "CHATPUSH_TOKEN",
  "CHATPUSH_HOOK_SECRET",
] as const

/** Что экран знает о ключе. 🔒 ЗНАЧЕНИЯ ЗДЕСЬ НЕТ И БЫТЬ НЕ МОЖЕТ. */
export type KeyState = {
  name: KeyName
  /** Задан хоть где-нибудь: в файле или в окружении. */
  set: boolean
  /** Откуда действующее значение. `env` означает «правит владелец сервера, не вы». */
  source: "file" | "env" | "none"
  /** Последние четыре знака — чтобы опознать, тот ли ключ, не показывая его. */
  tail: string | null
}

function readFile(): Partial<Record<KeyName, string>> {
  try {
    const raw: unknown = JSON.parse(readFileSync(FILE, "utf8"))
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Partial<Record<KeyName, string>>
    }
  } catch {
    // Файла нет — законное состояние: ключи ещё не вводили, работает окружение.
  }
  return {}
}

/**
 * Действующее значение ключа: файл сильнее окружения.
 *
 * 🔒 ПОРЯДОК ИМЕННО ТАКОЙ. Окружение — ЗАПАСНОЙ источник: уже настроенный сервер продолжает
 * работать, и переход на новый экран не требует делать что-то сразу. Обратный порядок
 * сделал бы экран бесполезным ровно там, где переменная уже задана, — то есть на всех
 * работающих машинах.
 */
export function integrationKey(name: KeyName): string {
  const fromFile = readFile()[name]
  if (fromFile) return fromFile
  return process.env[name] ?? ""
}

/** Состояние всех ключей — единственное, что уезжает на экран. */
export function keyStates(): KeyState[] {
  const file = readFile()
  return KEY_NAMES.map(name => {
    const fromFile = file[name] ?? ""
    const fromEnv = process.env[name] ?? ""
    const value = fromFile || fromEnv
    return {
      name,
      set: Boolean(value),
      source: fromFile ? "file" : fromEnv ? "env" : "none",
      // Четырёх знаков хватает опознать ключ и не хватает им воспользоваться.
      tail: value ? value.slice(-4) : null,
    }
  })
}

/**
 * Записать ключи. Принимается ЧАСТИЧНЫЙ набор.
 *
 * 🔒 ПУСТОЕ ЗНАЧЕНИЕ — ЭТО «НЕ МЕНЯТЬ», А НЕ «СТЕРЕТЬ». Иначе администратор, открывший
 * экран ради телефона и нажавший «Сохранить», молча снёс бы все пять ключей и узнал бы об
 * этом от пациентов, которым перестали приходить сообщения. Стирание — отдельное действие
 * с явным `null`.
 */
export function writeKeys(patch: Partial<Record<KeyName, string | null>>): void {
  const current = readFile()

  for (const name of KEY_NAMES) {
    if (!(name in patch)) continue
    const v = patch[name]
    if (v === null) {
      delete current[name]
      continue
    }
    const trimmed = String(v ?? "").trim()
    if (!trimmed) continue // пустое = не трогаем
    current[name] = trimmed
  }

  mkdirSync(dirname(FILE), { recursive: true })
  const tmp = `${FILE}.tmp`
  // Запись через временный файл и переименование — как у настроек компании: читают этот
  // файл на каждом запросе, и обрыв на прямой записи оставил бы его половинным.
  writeFileSync(tmp, `${JSON.stringify(current, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
  renameSync(tmp, FILE)
}
