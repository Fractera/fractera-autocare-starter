import "server-only"
import { db } from "@/lib/db"
import { idTail } from "@/lib/ids"
import { OPEN_TASK_STATUSES, DONE_TASK_STATUSES, TASK_STATUSES, type TaskStatus } from "./index"

// СОЗДАНИЕ И ВЕДЕНИЕ ЗАДАЧ.
//
// 🔒 ТРИ ПРЕДОХРАНИТЕЛЯ — СМЫСЛ ЭТОГО ФАЙЛА, А НЕ ЕГО УКРАШЕНИЕ. Дословно из
// исходника Филиппа: «без них кнопка „создать 459 задач“ превращается в
// спам-машину». Перенесены как продуктовое правило, а не как код.
//
//   1. нет согласия на связь          → задача не создаётся;
//   2. уже есть открытая задача       → второй повод человеку не заводится;
//   3. касались за последние 21 день  → не чаще одного касания в три недели.
//
// 🔒 ОТКАЗЫ СЧИТАЮТСЯ И ВОЗВРАЩАЮТСЯ ПООТДЕЛЬНОСТИ. Правило исходника: «Отсекаются
// молча, но количество каждого отказа возвращается — экран обязан показать
// пользователю, сколько задач реально создалось и почему остальные нет». Тот же
// закон, что у `skippedNoPhone` и `mergedByPhone`: молча пропустить нельзя, иначе
// «создано 12 из 459» выглядит поломкой, а не работой предохранителей.
//
// 🔒 ПЕРВЫЙ ПРЕДОХРАНИТЕЛЬ ЗАРАБОТАЛ ТОЛЬКО ПОСЛЕ ШАГА 13. До него согласие было
// единицей у всех — не потому, что все согласны, а потому, что CRM не отдавала
// поле. Проверка стояла и не отсекала никого.

/** Не чаще одного касания в три недели на человека. Число из исходника. */
export const COOLDOWN_DAYS = 21

export type CreateReport = {
  requested: number
  created: number
  skipped: {
    noConsent: number
    hasOpenTask: number
    recentlyContacted: number
    unknownPerson: number
  }
}

const OPEN = OPEN_TASK_STATUSES.map(s => `'${s}'`).join(",")
const DONE = DONE_TASK_STATUSES.map(s => `'${s}'`).join(",")
const CHUNK = 100

function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Завести задачи пачке людей.
 *
 * 🔒 ПРИГОДНОСТЬ ВСЕХ СЧИТАЕТСЯ ОДНИМ ЗАПРОСОМ, А НЕ ПО ЧЕЛОВЕКУ. Пятьсот
 * человек означали бы пятьсот походов в базу ещё до первой вставки — ровно та
 * ловушка, за которую уже заплачено в шаге 11.
 */
export async function createTasks(
  personIds: string[],
  opts: { scenarioId?: string | null; dueDate?: string; assignee?: string | null } = {},
): Promise<CreateReport> {
  const ids = [...new Set(personIds.filter(Boolean))]
  const report: CreateReport = {
    requested: personIds.length,
    created: 0,
    skipped: { noConsent: 0, hasOpenTask: 0, recentlyContacted: 0, unknownPerson: 0 },
  }
  if (!ids.length) return report

  const dueDate = opts.dueDate || new Date().toISOString().slice(0, 10)
  const scenarioId = opts.scenarioId || null
  const assignee = opts.assignee || null

  const holes = ids.map(() => "?").join(",")
  const rows = (await db
    .prepare(
      `SELECT p.id,
              p.consent_to_contact AS consent,
              (SELECT COUNT(*) FROM care_tasks t
                WHERE t.person_id = p.id AND t.status IN (${OPEN}))            AS open_tasks,
              (SELECT COUNT(*) FROM care_tasks t
                WHERE t.person_id = p.id AND t.status IN (${DONE})
                  AND date(t.updated_at) > date('now', '-${COOLDOWN_DAYS} days')) AS recent
         FROM care_people p
        WHERE p.id IN (${holes})`,
    )
    .all(...ids)) as unknown as { id: string; consent: number; open_tasks: number; recent: number }[]

  const found = new Set(rows.map(r => r.id))
  // Человек, которого нет в базе, — тоже отказ, и он считается. Молчание здесь
  // означало бы «создано меньше, чем просили» без единого объяснения.
  report.skipped.unknownPerson = ids.filter(id => !found.has(id)).length

  const target: string[] = []
  for (const r of rows) {
    // 🔒 ПОРЯДОК ПРОВЕРОК = ПОРЯДОК ВАЖНОСТИ ПРИЧИНЫ. Человек без согласия
    // считается «без согласия», даже если у него вдобавок открытая задача:
    // отчёт должен называть главную причину, а не ту, что проверили первой
    // случайно.
    if (!r.consent) { report.skipped.noConsent++; continue }
    if (Number(r.open_tasks) > 0) { report.skipped.hasOpenTask++; continue }
    if (Number(r.recent) > 0) { report.skipped.recentlyContacted++; continue }
    target.push(r.id)
  }

  // 🔒 КОД СТРОЖЕ ИНДЕКСА, И ЭТО НАМЕРЕННО. В базе стоит частичный уникальный
  // индекс на пару (человек, сценарий) — он ловит гонку двух генераций. Здесь
  // проверка шире: НИ ОДНОЙ открытой задачи на человека, независимо от сценария.
  // Индекс — последняя линия обороны от гонки; продуктовое правило — «не
  // дёргать человека дважды» — живёт здесь, и оно шире. Ручные задачи
  // (`scenario_id` пуст) индексом не покрыты вовсе, и без этой проверки их можно
  // было бы наплодить сколько угодно.
  for (const batch of chunks(target)) {
    const values = batch.map(() => "(?,?,?,?,?,?)").join(",")
    const params = batch.flatMap(pid => [`t-${idTail()}`, pid, scenarioId, assignee, "new", dueDate])
    await db
      .prepare(
        `INSERT INTO care_tasks (id, person_id, scenario_id, assignee, status, due_date)
         VALUES ${values}`,
      )
      .run(...params)
    report.created += batch.length
  }

  return report
}

/**
 * Сменить статус задачи.
 *
 * 🔒 СПИСОК СТАТУСОВ ЗАКРЫТ И ПРОВЕРЯЕТСЯ ЗДЕСЬ, а не только `CHECK` в схеме.
 * Отказ базы приходит как «нарушение ограничения» — по нему невозможно сказать
 * человеку, что именно он прислал не так.
 */
export async function setTaskStatus(
  id: string,
  status: TaskStatus,
  extra: { resultComment?: string | null; finalMessage?: string | null } = {},
): Promise<{ ok: true; from: string } | { ok: false; reason: "not_found" | "bad_status" }> {
  if (!(TASK_STATUSES as readonly string[]).includes(status)) return { ok: false, reason: "bad_status" }

  const before = (await db
    .prepare("SELECT status FROM care_tasks WHERE id = ?")
    .get(id)) as { status: string } | undefined
  if (!before) return { ok: false, reason: "not_found" }

  await db
    .prepare(
      `UPDATE care_tasks
          SET status = ?,
              result_comment = COALESCE(?, result_comment),
              final_message  = COALESCE(?, final_message),
              updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE id = ?`,
    )
    .run(status, extra.resultComment ?? null, extra.finalMessage ?? null, id)

  return { ok: true, from: before.status }
}

/**
 * След в журнале.
 *
 * 🔒 ПИШЕТСЯ `from` И `to`, А НЕ ТОЛЬКО НОВЫЙ СТАТУС. Правило исходника. Без
 * «откуда» журнал отвечает на «что стало» и молчит о том, что произошло: «стало
 * „отказался“» одинаково выглядит и после звонка, и после ошибочного нажатия.
 */
export async function logTaskEvent(
  actor: string,
  action: string,
  data: { personId?: string | null; taskId?: string | null; metadata?: unknown },
): Promise<string | null> {
  try {
    await db
      .prepare(
        `INSERT INTO care_activity_log (id, actor, person_id, task_id, action, metadata)
         VALUES (?,?,?,?,?,?)`,
      )
      .run(
        `al-${idTail()}`, actor,
        data.personId ?? null, data.taskId ?? null,
        action, data.metadata === undefined ? null : JSON.stringify(data.metadata),
      )
    return null
  } catch (e) {
    return String((e as Error).message ?? e)
  }
}
