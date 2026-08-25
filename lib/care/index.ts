import "server-only"
import { db } from "@/lib/db"

// ПРЕДМЕТНАЯ МОДЕЛЬ «АВТОЗАБОТЫ» — один слой между таблицами и экранами.
//
// Устроена как `lib/catalogue.ts`: типы строк, тег кэша и готовые запросы. Двери
// `/api/care/*` зовут отсюда и SQL у себя не пишут — иначе один и тот же запрос
// разъедется по маршрутам и однажды начнёт считать по-разному в двух местах.
//
// 🔒 ЧЕЛОВЕК И ЕГО ДЕЛО СОБИРАЮТСЯ ТОЛЬКО ЗДЕСЬ. `care_people` не покидает
// сервер; наружу уходит `person_id` и поля дела. Соединение обратно — в этом
// файле и в маршруте, а не где придётся.

/** Тег кэша: сбрасывается, когда данные людей меняются. */
export const CARE_TAG = "care"

/** Личность. 🔒 Ни одно поле отсюда не уходит наружу. */
export type CarePerson = {
  id: string
  full_name: string
  phone: string
  email: string | null
  birth_date: string | null
  consent_to_contact: number
  comment: string | null
}

/** Дело человека в сервисе: всё, кроме личности. Это видят сегменты и модель. */
export type CareCase = {
  person_id: string
  yclients_client_id: string | null
  service_direction: string | null
  doctor_name: string | null
  last_service: string | null
  last_visit_date: string | null
  next_visit_date: string | null
  visits_success_count: number | null
  visits_fail_count: number | null
  is_new_client: number | null
  lifetime_spent: number | null
}

/** Строка списка людей: личность плюс её дело плюс считаемые на лету факты. */
export type CarePersonRow = CarePerson &
  Omit<CareCase, "person_id"> & {
    /** Число визитов по истории, а не по колонке дела. */
    visits: number
    /** Сумма по истории визитов. */
    ltv: number
    /** Дата последнего состоявшегося визита по истории. */
    last_visit: string | null
    /** Есть ли запись вперёд. */
    has_future: number
    /** Есть ли открытая задача. */
    has_open_task: number
}

/** Визит: строка = одна услуга одного визита. */
export type CareVisit = {
  id: string
  person_id: string | null
  yclients_record_id: string
  visit_date: string
  attendance: number | null
  staff_name: string | null
  service_title: string | null
  service_cost: number | null
}

/** Шаги страницы — закрытый перечень: число из адреса идёт в SQL. */
export const PAGE_SIZES = [20, 40, 60] as const
export const DEFAULT_PAGE_SIZE = 20

// 🔒 ОДИН ИСТОЧНИК ПРАВДЫ О ТОМ, ЧТО ТАКОЕ «ОТКРЫТАЯ ЗАДАЧА».
// Три статуса из семи. Перечисленные строкой в каждом запросе, они однажды
// разойдутся: в одном месте забудут `postponed`, и счётчик на кнопке перестанет
// сходиться со списком под ней.
export const OPEN_TASK_STATUSES = ["new", "in_progress", "postponed"] as const
const OPEN = OPEN_TASK_STATUSES.map(s => `'${s}'`).join(",")

/**
 * Общая часть запроса списка людей: дело, факты по истории визитов, признаки.
 *
 * 🔒 ФАКТЫ СЧИТАЮТСЯ ИЗ `care_visits`, А НЕ ИЗ КОЛОНОК ДЕЛА. Колонки
 * `last_visit_date` / `next_visit_date` заполнены у меньшинства карточек — это
 * записано в самом исходнике его автором, и отчёт, построенный на них, врал о
 * трети базы.
 */
const PERSON_FROM = `
  FROM care_people p
  LEFT JOIN care_cases c ON c.person_id = p.id
  LEFT JOIN (
    SELECT person_id,
           COUNT(DISTINCT yclients_record_id) AS visits,
           COALESCE(SUM(service_cost), 0)     AS ltv,
           MAX(CASE WHEN visit_date <= date('now') THEN visit_date END) AS last_visit
    FROM care_visits WHERE person_id IS NOT NULL GROUP BY person_id
  ) v ON v.person_id = p.id
  LEFT JOIN (
    SELECT DISTINCT person_id FROM care_visits
    WHERE person_id IS NOT NULL AND visit_date > date('now')
  ) fut ON fut.person_id = p.id
  LEFT JOIN (
    SELECT DISTINCT person_id FROM care_tasks WHERE status IN (${OPEN})
  ) ot ON ot.person_id = p.id`

const PERSON_SELECT = `
  SELECT p.id, p.full_name, p.phone, p.email, p.birth_date, p.consent_to_contact, p.comment,
         c.yclients_client_id, c.service_direction, c.doctor_name, c.last_service,
         c.last_visit_date, c.next_visit_date, c.visits_success_count, c.visits_fail_count,
         c.is_new_client, c.lifetime_spent,
         COALESCE(v.visits, 0) AS visits,
         COALESCE(v.ltv, 0)    AS ltv,
         v.last_visit,
         (fut.person_id IS NOT NULL) AS has_future,
         (ot.person_id  IS NOT NULL) AS has_open_task`

/**
 * Условие поиска — ОДНО на список и на счёт.
 *
 * 🔒 ПУСТОЙ ШАБЛОН ТЕЛЕФОНА НЕ ДОБАВЛЯЕТСЯ В УСЛОВИЕ. ✗ Оплачено 2026-08-25:
 * условие строилось как `full_name LIKE ? OR phone LIKE ?` всегда, а для
 * нечислового запроса второй шаблон вырождался в `%%` — он совпадает с КАЖДОЙ
 * строкой, и `OR` пропускал всю базу. Поиск «Иван» возвращал 1844 человека из
 * 1844 и выглядел работающим: строки приходили, счётчик не менялся, а что
 * фильтр не отсеял никого, видно только если знать общее число.
 *
 * 🔒 И ЭТО ОДНА ФУНКЦИЯ, А НЕ ДВЕ ОДИНАКОВЫХ. Список и счёт обязаны отбирать
 * ровно одно и то же: разойдись они — подпись «найдено 12» встанет над сорока
 * строками, и доверия не будет ни к той, ни к другой цифре.
 */
function searchWhere(q?: string): { where: string; args: string[] } {
  const text = q?.trim()
  if (!text) return { where: "", args: [] }

  const digits = text.replace(/[^\d+]/g, "")
  const parts = ["p.full_name LIKE ?"]
  const args = [`%${text}%`]
  if (digits) {
    parts.push("p.phone LIKE ?")
    args.push(`%${digits}%`)
  }
  return { where: ` WHERE ${parts.join(" OR ")}`, args }
}

/**
 * Страница списка людей.
 *
 * 🔒 ПОРЯДОК СТРОГО ДЕТЕРМИНИРОВАН — с добивкой по `id`. У многих одинаковый
 * LTV или его нет вовсе, и без последнего ключа один и тот же человек попадает
 * на две страницы подряд, а кто-то не попадает ни на одну.
 */
export async function peoplePage(
  { q, limit = DEFAULT_PAGE_SIZE, offset = 0 }: { q?: string; limit?: number; offset?: number },
): Promise<CarePersonRow[]> {
  const { where, args } = searchWhere(q)
  const rows = await db
    .prepare(
      `${PERSON_SELECT} ${PERSON_FROM} ${where}
       ORDER BY ltv DESC, p.updated_at DESC, p.id
       LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset)
  return rows as unknown as CarePersonRow[]
}

/** Сколько людей в выборке — теми же условиями, что и сам список. */
export async function peopleCount(q?: string): Promise<number> {
  const { where, args } = searchWhere(q)
  const row = (await db
    .prepare(`SELECT COUNT(*) AS n FROM care_people p ${where}`)
    .get(...args)) as { n: number } | undefined
  return Number(row?.n ?? 0)
}

/** Один человек со своим делом. */
export async function personById(id: string): Promise<CarePersonRow | undefined> {
  const row = await db.prepare(`${PERSON_SELECT} ${PERSON_FROM} WHERE p.id = ?`).get(id)
  return row as unknown as CarePersonRow | undefined
}

/** Визиты одного человека, свежие сверху. */
export async function visitsOf(personId: string): Promise<CareVisit[]> {
  const rows = await db
    .prepare(
      `SELECT id, person_id, yclients_record_id, visit_date, attendance, staff_name, service_title, service_cost
       FROM care_visits WHERE person_id = ? ORDER BY visit_date DESC, service_title`,
    )
    .all(personId)
  return rows as unknown as CareVisit[]
}

/**
 * Числа аудита: можно ли доверять базе, по которой принимают решения.
 *
 * 🔒 ЭКРАН АУДИТА СУЩЕСТВУЕТ, ПОТОМУ ЧТО ДАННЫЕ ПРИШЛИ ИЗ ЧУЖОЙ СИСТЕМЫ. Часть
 * строк CRM неполна не по нашей вине и не по вине клиники: администратор не
 * записал телефон, приём не привязали к карточке. Пока эти числа не названы,
 * любой отчёт продукта выглядит точным — а он посчитан по базе, треть которой
 * может быть дырявой.
 *
 * 🔒 СЧИТАЕТСЯ ПО ФАКТУ, А НЕ ХРАНИТСЯ. Хранимый счётчик расходится с
 * действительностью в тот день, когда кто-то поправит строку руками.
 */
export type CareAudit = {
  /** Всего людей в базе. */
  people: number
  /** Всего строк визитов (строка = одна услуга). */
  visitRows: number
  /** Различных записей CRM среди визитов. */
  crmRecords: number
  /**
   * Визиты, не привязанные ни к одному человеку.
   *
   * 🔒 ГЛАВНОЕ ЧИСЛО ЭТОГО ЭКРАНА. Это приёмы, за которыми не стоит карточка:
   * деньги посчитаны, а позвать человека снова невозможно — некому. Клиника
   * имеет право знать масштаб, а не узнавать его из расхождения отчётов.
   */
  visitsWithoutPerson: number
  /** Люди, которым нельзя писать: согласие снято. */
  withoutConsent: number
  /** Люди, за которыми нет ни одного визита в окне выгрузки. */
  neverVisited: number
  /** Строки визитов без названия услуги — приём есть, что делали, не записано. */
  visitsWithoutService: number
  /** Люди без даты рождения: поздравление им отправить не с чем. */
  withoutBirthday: number
}

export async function careAudit(): Promise<CareAudit> {
  // Один запрос на все числа, а не восемь: восемь дали бы восемь моментов
  // времени, и сумма частей могла бы не сойтись с целым прямо на экране.
  const row = (await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM care_people)                                        AS people,
         (SELECT COUNT(*) FROM care_visits)                                        AS visitRows,
         (SELECT COUNT(DISTINCT yclients_record_id) FROM care_visits)              AS crmRecords,
         (SELECT COUNT(*) FROM care_visits WHERE person_id IS NULL)                AS visitsWithoutPerson,
         (SELECT COUNT(*) FROM care_people WHERE consent_to_contact = 0)           AS withoutConsent,
         (SELECT COUNT(*) FROM care_people p
            WHERE NOT EXISTS (SELECT 1 FROM care_visits v WHERE v.person_id = p.id)) AS neverVisited,
         (SELECT COUNT(*) FROM care_visits WHERE COALESCE(service_title,'') = '')  AS visitsWithoutService,
         (SELECT COUNT(*) FROM care_people WHERE birth_date IS NULL OR birth_date = '') AS withoutBirthday`,
    )
    .get()) as Record<string, number> | undefined

  const n = (k: string) => Number(row?.[k] ?? 0)
  return {
    people: n("people"),
    visitRows: n("visitRows"),
    crmRecords: n("crmRecords"),
    visitsWithoutPerson: n("visitsWithoutPerson"),
    withoutConsent: n("withoutConsent"),
    neverVisited: n("neverVisited"),
    visitsWithoutService: n("visitsWithoutService"),
    withoutBirthday: n("withoutBirthday"),
  }
}

/** Что записал последний прогон синхронизации. `null` — прогонов ещё не было. */
export type LastSync = {
  at: string
  actor: string
  clients: number
  peopleInserted: number
  peopleUpdated: number
  visitRows: number
  skippedNoPhone: number
  mergedByPhone: number
  /** Ноль означает «CRM не отдала поле», а не «все согласны». */
  consentKnown: number
  /** Сколько карточек принесли ЗАПОЛНЕННУЮ дату рождения. */
  birthdayKnown: number
  /** У скольких карточек ключ `birth_date` вообще был. Отличает «пусто» от «не спрашивали». */
  birthdayFieldSeen: number
  /** У скольких карточек был ключ `sms_not`. */
  consentFieldSeen: number
}

export async function lastSyncRun(): Promise<LastSync | null> {
  const row = (await db
    .prepare(
      `SELECT created_at, actor, metadata FROM care_activity_log
        WHERE action = 'crm_sync' ORDER BY created_at DESC LIMIT 1`,
    )
    .get()) as { created_at: string; actor: string; metadata: string } | undefined
  if (!row) return null

  try {
    const m = JSON.parse(row.metadata ?? "{}")
    return {
      at: row.created_at,
      actor: row.actor,
      clients: Number(m.clients) || 0,
      peopleInserted: Number(m.peopleInserted) || 0,
      peopleUpdated: Number(m.peopleUpdated) || 0,
      visitRows: Number(m.visitRows) || 0,
      skippedNoPhone: Number(m.skippedNoPhone) || 0,
      mergedByPhone: Number(m.mergedByPhone) || 0,
      consentKnown: Number(m.consentKnown) || 0,
      birthdayKnown: Number(m.birthdayKnown) || 0,
      birthdayFieldSeen: Number(m.birthdayFieldSeen) || 0,
      consentFieldSeen: Number(m.consentFieldSeen) || 0,
    }
  } catch {
    // Испорченный JSON в журнале — не повод ронять экран: прогон был, а
    // подробности потеряны, и честнее сказать это, чем показать нули как факт.
    return null
  }
}

/** Что записал последний проход за согласием. `null` — проходов ещё не было. */
export type LastConsent = {
  at: string
  actor: string
  checked: number
  unreadable: number
  withAgreement: number
  refused: number
  allowed: number
  noRecord: number
  changed: number
  seconds: number
}

export async function lastConsentRun(): Promise<LastConsent | null> {
  const row = (await db
    .prepare(
      `SELECT created_at, actor, metadata FROM care_activity_log
        WHERE action = 'crm_consent' ORDER BY created_at DESC LIMIT 1`,
    )
    .get()) as { created_at: string; actor: string; metadata: string } | undefined
  if (!row) return null

  try {
    const m = JSON.parse(row.metadata ?? "{}")
    const n = (k: string) => Number(m[k]) || 0
    return {
      at: row.created_at,
      actor: row.actor,
      checked: n("checked"),
      unreadable: n("unreadable"),
      withAgreement: n("withAgreement"),
      refused: n("refused"),
      allowed: n("allowed"),
      noRecord: n("noRecord"),
      changed: n("changed"),
      seconds: n("seconds"),
    }
  } catch {
    return null
  }
}
