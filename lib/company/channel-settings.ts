import "server-only"
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "fs"
import { join, dirname } from "path"

// НАСТРОЙКИ КАНАЛА СВЯЗИ: что позволено знать ответу и по какой инструкции он составляется.
//
// 🔒 ТОТ ЖЕ ФАЙЛОВЫЙ ПРИЁМ, ЧТО У КЛЮЧЕЙ (шаг 29): читается свежим на каждый запрос,
// значит сохранение действует сразу. Лежит в `storage/` — вне git и вне доставки.

const FILE = process.env.CHANNEL_SETTINGS_PATH ?? join(process.cwd(), "storage", "channel-settings.json")

/**
 * Источники, которыми ответу разрешено пользоваться.
 *
 * 🔒 ИМЕНА СОВПАДАЮТ С НАЗВАНИЯМИ СЛУЖБ, а не придуманы: `data` — слой данных на 3300,
 * `map` — карта на 3400, `rag` — граф знаний на 9621. Так видно, что переключатель
 * относится к живой машине, а не к абстракции.
 */
export type SourceName = "crm" | "calendar" | "map" | "data" | "vector" | "rag"

export const SOURCE_NAMES: readonly SourceName[] = ["crm", "calendar", "map", "data", "vector", "rag"] as const

export type ChannelSettings = {
  sources: Record<SourceName, boolean>
  /** Инструкция для модели: по ней составляется ответ пациенту. */
  instruction: string
  /**
   * Номера для ПРОВЕРКИ канала.
   *
   * 🔒 ПЕРЕЕХАЛИ СЮДА ИЗ НАСТРОЕК КОМПАНИИ (шаг 32). Там они были не на месте: компания —
   * это «кто мы» (имя, телефон, логотип), а тестовый номер — «как мы проверяем связь».
   * Практическая цена прежнего места вскрылась сразу: сохранение номера шло дверью
   * компании, а та требует непустого названия — то есть номер нельзя было записать, не
   * трогая идентичность сайта.
   */
  testWhatsapp: string
  testTelegram: string
  /**
   * Окно тишины: часы, вне которых сообщения НЕ уходят (шаг 37).
   *
   * 🔒 БЕЗ ЧАСОВОГО ПОЯСА ЭТО БЕССМЫСЛИЦА. Сервер живёт в UTC, пациент — в своём
   * времени: «не раньше десяти» без пояса означает час ночи в Кисловодске. Поэтому
   * рядом хранится смещение клиники, а не только часы.
   */
  quietFrom: number
  quietTo: number
  /** Смещение клиники от UTC в часах: Кисловодск = 3. */
  timezoneOffset: number
  /** Не больше стольких сообщений одному человеку в сутки. */
  perDay: number
  /** И столько же в неделю. */
  perWeek: number
  /**
   * Разрешена ли рассылка вообще (шаг 38).
   *
   * 🔒 ГЛАВНЫЙ РУБИЛЬНИК, И ОН ВЫКЛЮЧЕН ПО УМОЛЧАНИЮ. Опасение владельца дословно
   * (2026-08-25): «может случиться так, что мы будем ещё баловаться, а все эти сообщения
   * улетят к клиентам». Оно обоснованное: в очереди 96 задач с наступившим сроком, а
   * таймер уже стоит на бою. Один неверный предел — и они уходят живым людям.
   *
   * Выключенный рубильник дешевле любой осторожности в коде: пока владелец не включил
   * рассылку сам, таймер смотрит очередь и не отправляет НИЧЕГО.
   */
  sendingEnabled: boolean
}

const DEFAULTS: ChannelSettings = {
  // 🔒 ВКЛЮЧЁН ТОЛЬКО ТОТ ИСТОЧНИК, ЧТО УЖЕ РАБОТАЕТ. CRM в базе есть — 1844 человека и
  // 6232 визита. Остальные пять включает владелец, когда их подключат: включённое по
  // умолчанию и неработающее — это обещание, которого продукт не сдержит.
  sources: { crm: true, calendar: false, map: false, data: false, vector: false, rag: false },
  instruction: "",
  testWhatsapp: "",
  testTelegram: "",
  // 🔒 УМОЛЧАНИЯ ОСТОРОЖНЫЕ, А НЕ УДОБНЫЕ. С десяти до двадцати — часы, в которые
  // сообщение от клиники не выглядит вторжением; один раз в сутки — предел, при котором
  // два правила, попавшие на одного человека, не превращаются в рассылку.
  quietFrom: 10,
  quietTo: 20,
  timezoneOffset: 3,
  perDay: 1,
  perWeek: 3,
  sendingEnabled: false,
}

export function readChannelSettings(): ChannelSettings {
  try {
    const raw: unknown = JSON.parse(readFileSync(FILE, "utf8"))
    if (raw && typeof raw === "object") {
      const o = raw as Partial<ChannelSettings>
      return {
        sources: { ...DEFAULTS.sources, ...(o.sources ?? {}) },
        instruction: typeof o.instruction === "string" ? o.instruction : "",
        testWhatsapp: typeof o.testWhatsapp === "string" ? o.testWhatsapp : "",
        testTelegram: typeof o.testTelegram === "string" ? o.testTelegram : "",
        quietFrom: typeof o.quietFrom === "number" ? o.quietFrom : DEFAULTS.quietFrom,
        quietTo: typeof o.quietTo === "number" ? o.quietTo : DEFAULTS.quietTo,
        timezoneOffset: typeof o.timezoneOffset === "number" ? o.timezoneOffset : DEFAULTS.timezoneOffset,
        perDay: typeof o.perDay === "number" ? o.perDay : DEFAULTS.perDay,
        perWeek: typeof o.perWeek === "number" ? o.perWeek : DEFAULTS.perWeek,
        sendingEnabled: o.sendingEnabled === true,
      }
    }
  } catch {
    // Файла нет — настройки ещё не трогали. Законное состояние.
  }
  return DEFAULTS
}

export function writeChannelSettings(patch: Partial<ChannelSettings>): ChannelSettings {
  const current = readChannelSettings()
  const next: ChannelSettings = {
    sources: { ...current.sources, ...(patch.sources ?? {}) },
    instruction: patch.instruction !== undefined ? String(patch.instruction).slice(0, 20000) : current.instruction,
    testWhatsapp: patch.testWhatsapp !== undefined ? String(patch.testWhatsapp).slice(0, 40) : current.testWhatsapp,
    testTelegram: patch.testTelegram !== undefined ? String(patch.testTelegram).slice(0, 40) : current.testTelegram,
    quietFrom: patch.quietFrom !== undefined ? Math.max(0, Math.min(23, Number(patch.quietFrom))) : current.quietFrom,
    quietTo: patch.quietTo !== undefined ? Math.max(0, Math.min(23, Number(patch.quietTo))) : current.quietTo,
    timezoneOffset: patch.timezoneOffset !== undefined ? Math.max(-12, Math.min(14, Number(patch.timezoneOffset))) : current.timezoneOffset,
    perDay: patch.perDay !== undefined ? Math.max(1, Math.min(10, Number(patch.perDay))) : current.perDay,
    perWeek: patch.perWeek !== undefined ? Math.max(1, Math.min(30, Number(patch.perWeek))) : current.perWeek,
    sendingEnabled: patch.sendingEnabled !== undefined ? patch.sendingEnabled === true : current.sendingEnabled,
  }
  mkdirSync(dirname(FILE), { recursive: true })
  const tmp = `${FILE}.tmp`
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8")
  renameSync(tmp, FILE)
  return next
}

// ─── Живость служб ───────────────────────────────────────────────────────────
//
// 🔒 ПЕРЕКЛЮЧАТЕЛЬ ПОКАЗЫВАЕТ НЕ ТОЛЬКО РЕШЕНИЕ ВЛАДЕЛЬЦА, НО И СОСТОЯНИЕ СЛУЖБЫ.
// ✗ В проекте уже оплачено (шаг 522): три выключателя подвала предлагались панелью,
// хранились в конфиге и НЕ ВЫКЛЮЧАЛИ НИЧЕГО — «выключатель, который ничего не выключает,
// хуже отсутствующего: человек считает задачу решённой». Здесь та же ловушка ждала
// шестерых: их потребитель (составление ответа) ещё не построен. Показ живости делает
// переключатель честным СЕГОДНЯ: включённый источник, чья служба молчит, виден сразу.

export type SourceHealth = { name: SourceName; reachable: boolean; detail: string }

const PORTS: Partial<Record<SourceName, string>> = {
  map: process.env.MAP_URL ?? "http://localhost:3400",
  data: process.env.REMOTE_DATA_URL ?? "http://localhost:3300",
  vector: process.env.REMOTE_DATA_URL ?? "http://localhost:3300",
  rag: process.env.LIGHTRAG_URL ?? "http://localhost:9621",
}

/**
 * Отвечает ли служба источника.
 *
 * 🔒 ЛЮБОЙ ОТВЕТ — ЭТО «ЖИВА», ВКЛЮЧАЯ 401 И 404. Служба, просящая ключ, работает; служба
 * без корневого маршрута работает тоже. Мёртвая не отвечает вовсе — обрывом или таймаутом.
 * Считать `200` единственным признаком жизни значило бы объявить мёртвыми три из четырёх.
 */
export async function sourceHealth(): Promise<SourceHealth[]> {
  const out: SourceHealth[] = []
  for (const name of SOURCE_NAMES) {
    // CRM и календарь идут через уже работающий обмен с YCLIENTS, своего порта у них нет.
    if (name === "crm" || name === "calendar") {
      out.push({ name, reachable: true, detail: "через синхронизацию CRM" })
      continue
    }
    const url = PORTS[name]
    if (!url) { out.push({ name, reachable: false, detail: "адрес не задан" }); continue }
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) })
      out.push({ name, reachable: true, detail: `отвечает (${r.status})` })
    } catch {
      out.push({ name, reachable: false, detail: "не отвечает" })
    }
  }
  return out
}
