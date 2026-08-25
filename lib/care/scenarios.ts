import "server-only"
import { db } from "@/lib/db"
import { idTail } from "@/lib/ids"
import { OPEN_TASK_STATUSES } from "./index"

// СЦЕНАРИИ — правила, по которым система решает, кого и когда коснуться.
//
// 🔒 ЭТО ЯДРО ПРОДУКТА, А НЕ СПРАВОЧНИК. Всё остальное — люди, визиты, очередь —
// существует, чтобы эти правила могли сработать.

/**
 * Шесть типов триггера. Перечень закрыт и повторяет комментарий в `SCHEMA`.
 *
 * 🔒 ПЕРЕЧЕНЬ ЗДЕСЬ, А НЕ СТРОКОЙ В МАРШРУТЕ. Значение приходит снаружи и уходит
 * в базу, где его ждёт своя проверка; разойдись два списка — дверь пропустит то,
 * что схема отвергнет, и человек увидит «нарушение ограничения» вместо ответа.
 */
export const TRIGGER_TYPES = [
  "no_visit_for_days",
  "upcoming_visit",
  "after_visit",
  "birthday",
  "unfinished_treatment",
  "manual_segment",
] as const
export type TriggerType = (typeof TRIGGER_TYPES)[number]

/**
 * 🔴 ТРИГГЕРЫ БЕЗ ИСТОЧНИКА ДАННЫХ НА ЭТОМ ФИЛИАЛЕ.
 *
 * `birthday` мёртв: дата рождения не заполнена НИ У КОГО из 1844 (шаг 13-1,
 * измерено прямым запросом к CRM). Правило с этим триггером не выстрелит ни
 * разу. ✗ Молча предложить его в списке — значит дать завести правило, которое
 * никогда не сработает, и ждать результата месяцами.
 *
 * Список проверяется КОДОМ, а не памятью: появятся даты — строка уйдёт отсюда.
 */
export const TRIGGERS_WITHOUT_DATA: TriggerType[] = ["birthday"]

export type CareScenario = {
  id: string
  title: string
  description: string | null
  trigger_type: TriggerType
  days_offset: number
  service_direction: string | null
  message_goal: string
  is_active: number
  created_at: string
  /** Сколько задач породило правило. */
  tasks_total: number
  /** Сколько из них кончились записью. */
  tasks_booked: number
  /** Сколько задач по нему открыто прямо сейчас. */
  tasks_open: number
}

const OPEN = OPEN_TASK_STATUSES.map(s => `'${s}'`).join(",")

/**
 * Все правила с мерой их пользы.
 *
 * 🔒 ДВА ЧИСЛА РЯДОМ С КАЖДЫМ ПРАВИЛОМ — ЗАКОН, ВЗЯТЫЙ ИЗ ИСХОДНИКА. Сколько
 * задач породило и сколько кончились записью. Без них правило невозможно
 * оценить: оно либо возвращает людей, либо гоняет их впустую, и отличить одно от
 * другого нечем. Правило без меры живёт вечно, потому что никто не видит, что
 * оно не работает.
 */
export async function scenariosList(): Promise<CareScenario[]> {
  const rows = await db
    .prepare(
      `SELECT s.id, s.title, s.description, s.trigger_type, s.days_offset,
              s.service_direction, s.message_goal, s.is_active, s.created_at,
              (SELECT COUNT(*) FROM care_tasks t WHERE t.scenario_id = s.id) AS tasks_total,
              (SELECT COUNT(*) FROM care_tasks t WHERE t.scenario_id = s.id AND t.status = 'booked') AS tasks_booked,
              (SELECT COUNT(*) FROM care_tasks t WHERE t.scenario_id = s.id AND t.status IN (${OPEN})) AS tasks_open
         FROM care_scenarios s
        ORDER BY s.is_active DESC, s.created_at DESC, s.id`,
    )
    .all()
  return rows as unknown as CareScenario[]
}

export async function scenarioById(id: string): Promise<CareScenario | undefined> {
  const rows = await scenariosList()
  return rows.find(s => s.id === id)
}

export type ScenarioInput = {
  title: string
  description?: string | null
  triggerType: TriggerType
  daysOffset?: number
  serviceDirection?: string | null
  messageGoal: string
  isActive?: boolean
}

export type ScenarioProblem = "no_title" | "bad_trigger" | "no_goal" | "bad_offset"

/**
 * Проверка правила ДО базы.
 *
 * 🔒 ПРИЧИНА НАЗЫВАЕТСЯ ПОИМЕННО. Отказ базы приходит как «нарушение
 * ограничения»; по нему нельзя сказать человеку, какое поле он не заполнил.
 */
export function validateScenario(input: Partial<ScenarioInput>): ScenarioProblem | null {
  if (!input.title?.trim()) return "no_title"
  if (!input.triggerType || !(TRIGGER_TYPES as readonly string[]).includes(input.triggerType)) return "bad_trigger"
  // 🔒 ЦЕЛЬ КОНТАКТА ОБЯЗАТЕЛЬНА. Это не описание для красоты: её получит модель,
  // когда придёт черёд писать текст. Правило без цели породит задачи, по которым
  // непонятно, что человеку сказать.
  if (!input.messageGoal?.trim()) return "no_goal"
  const off = Number(input.daysOffset ?? 0)
  // Отрицательный порог означал бы «за N дней до того, как не пришёл» — бессмыслицу.
  if (!Number.isFinite(off) || off < 0 || off > 3650) return "bad_offset"
  return null
}

export async function createScenario(input: ScenarioInput): Promise<string> {
  const id = `sc-${idTail()}`
  await db
    .prepare(
      `INSERT INTO care_scenarios
         (id, title, description, trigger_type, days_offset, service_direction, message_goal, is_active)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      input.title.trim(),
      input.description?.trim() || null,
      input.triggerType,
      Number(input.daysOffset) || 0,
      input.serviceDirection?.trim() || null,
      input.messageGoal.trim(),
      input.isActive === false ? 0 : 1,
    )
  return id
}

/**
 * Правка правила.
 *
 * 🔒 МЕНЯЕТСЯ ТОЛЬКО ПРИСЛАННОЕ. Не приславший поле не обнуляет его: форма
 * правки может открываться на части полей, и «пусто» в запросе означает «не
 * трогал», а не «сотри».
 */
export async function updateScenario(
  id: string,
  patch: Partial<ScenarioInput>,
): Promise<{ ok: true; before: CareScenario } | { ok: false; reason: "not_found" }> {
  const before = await scenarioById(id)
  if (!before) return { ok: false, reason: "not_found" }

  const sets: string[] = []
  const vals: unknown[] = []
  const put = (col: string, v: unknown) => { sets.push(`${col} = ?`); vals.push(v) }

  if (patch.title !== undefined) put("title", patch.title.trim())
  if (patch.description !== undefined) put("description", patch.description?.trim() || null)
  if (patch.triggerType !== undefined) put("trigger_type", patch.triggerType)
  if (patch.daysOffset !== undefined) put("days_offset", Number(patch.daysOffset) || 0)
  if (patch.serviceDirection !== undefined) put("service_direction", patch.serviceDirection?.trim() || null)
  if (patch.messageGoal !== undefined) put("message_goal", patch.messageGoal.trim())
  if (patch.isActive !== undefined) put("is_active", patch.isActive ? 1 : 0)

  if (sets.length) {
    vals.push(id)
    await db.prepare(`UPDATE care_scenarios SET ${sets.join(", ")} WHERE id = ?`).run(...vals)
  }
  return { ok: true, before }
}

// ─────────────────────────────────────────────────────────────────────────────
// СВЕДЕНИЕ ПРАВИЛА С ЛЮДЬМИ.
//
// 🔒 ФАКТЫ О ВИЗИТАХ СЧИТАЮТСЯ ИЗ `care_visits`, А НЕ ИЗ КОЛОНОК ДЕЛА — И ЭТО
// ДЕФЕКТ ИСХОДНИКА, КОТОРЫЙ МЫ НЕ ПОВТОРЯЕМ. Генерация Филиппа отбирает людей по
// `patients.last_visit_date` и `next_visit_date`; его же собственный код в другом
// месте записывает, что эти колонки заполнены у МЕНЬШИНСТВА карточек. Правило,
// построенное на них, молча пропустило бы большинство тех, кого должно было
// найти, — и никто бы этого не заметил: пустая выборка выглядит как «подходящих
// нет».
//
// 🔒 ПОСЛЕДНИМ ВИЗИТОМ СЧИТАЕТСЯ ТОЛЬКО СОСТОЯВШИЙСЯ (`attendance = 1`), как в
// шаге 11. Неявка — не визит: человек, трижды не пришедший, по датам выглядел бы
//активным, а по сути потерян.

/** Что вышло при сведении правила с базой. */
export type ScenarioMatch = {
  scenarioId: string
  title: string
  triggerType: TriggerType
  /** Идентификаторы подходящих людей. */
  personIds: string[]
  /** Правило не сводится автоматически — таких два. */
  manual: boolean
  /** У триггера нет данных на этом филиале. */
  noData: boolean
}

/**
 * Общая часть: последний состоявшийся и ближайший будущий визит человека.
 * Считается из истории, а не из колонок дела.
 */
const VISIT_FACTS = `
  LEFT JOIN (
    SELECT person_id,
           MAX(CASE WHEN visit_date <= date('now') AND attendance = 1 THEN visit_date END) AS last_visit,
           MIN(CASE WHEN visit_date >  date('now') THEN visit_date END)                    AS next_visit
      FROM care_visits WHERE person_id IS NOT NULL GROUP BY person_id
  ) v ON v.person_id = p.id`

/**
 * Кто подходит под правило ПРЯМО СЕЙЧАС.
 *
 * 🔒 СОГЛАСИЕ ПРОВЕРЯЕТСЯ УЖЕ ЗДЕСЬ, хотя его же проверит `createTasks`. Причина
 * не в надёжности, а в честности числа: экран показывает «под правило подходит
 * N человек», и N обязано означать «стольким мы вправе написать», а не «стольким
 * подошло бы, если бы все разрешили».
 */
export async function scenarioCandidates(s: CareScenario): Promise<ScenarioMatch> {
  const base: ScenarioMatch = {
    scenarioId: s.id,
    title: s.title,
    triggerType: s.trigger_type,
    personIds: [],
    manual: false,
    noData: (TRIGGERS_WITHOUT_DATA as readonly string[]).includes(s.trigger_type),
  }

  // 🔒 ДВА ТРИГГЕРА НЕ СВОДЯТСЯ АВТОМАТИЧЕСКИ — так и в исходнике: «Триггер
  // выполняется вручную». Людей под них выбирает человек, а не запрос.
  if (s.trigger_type === "manual_segment" || s.trigger_type === "unfinished_treatment") {
    return { ...base, manual: true }
  }

  // 🔒 НАПРАВЛЕНИЕ СУЖАЕТ ПО РЕАЛЬНО ОКАЗАННЫМ УСЛУГАМ, А НЕ ПО `service_direction`.
  // Колонка дела пуста у всех: CRM её не отдаёт (шаг 13). Фильтровать по ней
  // значило бы получить пустую выборку и решить, что подходящих нет.
  const dirJoin = s.service_direction
    ? ` AND EXISTS (SELECT 1 FROM care_visits d
                     WHERE d.person_id = p.id AND d.service_title LIKE ?)`
    : ""
  const dirArgs = s.service_direction ? [`%${s.service_direction}%`] : []

  const off = Number(s.days_offset) || 0
  let where: string
  const args: unknown[] = []

  if (s.trigger_type === "no_visit_for_days") {
    // Не был дольше порога И НЕ ЗАПИСАН вперёд. Второе условие — из исходника, и
    // оно существенно: звать того, кто уже придёт послезавтра, значит дёргать
    // человека зря и портить впечатление о клинике.
    where = `v.last_visit IS NOT NULL
             AND v.last_visit <= date('now', '-${off} days')
             AND v.next_visit IS NULL`
  } else if (s.trigger_type === "upcoming_visit") {
    where = `v.next_visit IS NOT NULL
             AND v.next_visit BETWEEN date('now') AND date('now', '+${off} days')`
  } else if (s.trigger_type === "after_visit") {
    // Ровно через N дней после визита, как в исходнике: это «как вы себя
    // чувствуете после процедуры», а не «когда-нибудь потом».
    where = `v.last_visit = date('now', '-${off} days')`
  } else {
    // `birthday`: поля нет ни у кого на этом филиале (шаг 13). Запрос честно
    // вернёт пусто, а `noData` объяснит экрану, почему.
    where = `p.birth_date IS NOT NULL AND p.birth_date <> ''
             AND substr(p.birth_date, 6, 5) BETWEEN strftime('%m-%d','now')
                                                AND strftime('%m-%d','now','+${off} days')`
  }

  const rows = (await db
    .prepare(
      `SELECT p.id FROM care_people p ${VISIT_FACTS}
        WHERE p.consent_to_contact = 1 AND ${where} ${dirJoin}
        ORDER BY p.id`,
    )
    .all(...dirArgs, ...args)) as unknown as { id: string }[]

  return { ...base, personIds: rows.map(r => r.id) }
}
