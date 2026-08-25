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
 * Страница списка людей.
 *
 * 🔒 ПОРЯДОК СТРОГО ДЕТЕРМИНИРОВАН — с добивкой по `id`. У многих одинаковый
 * LTV или его нет вовсе, и без последнего ключа один и тот же человек попадает
 * на две страницы подряд, а кто-то не попадает ни на одну.
 */
export async function peoplePage(
  { q, limit = DEFAULT_PAGE_SIZE, offset = 0 }: { q?: string; limit?: number; offset?: number },
): Promise<CarePersonRow[]> {
  const where = q ? " WHERE p.full_name LIKE ? OR p.phone LIKE ?" : ""
  const args = q ? [`%${q}%`, `%${q.replace(/[^\d+]/g, "")}%`] : []
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
  const where = q ? " WHERE p.full_name LIKE ? OR p.phone LIKE ?" : ""
  const args = q ? [`%${q}%`, `%${q.replace(/[^\d+]/g, "")}%`] : []
  const row = (await db
    .prepare(`SELECT COUNT(*) AS n FROM care_people p ${where.replace(" WHERE p.", " WHERE p.")}`)
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
