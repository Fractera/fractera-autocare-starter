// @api summarise what the system found and what it achieved
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { db } from "@/lib/db"
import { OPEN_TASK_STATUSES, DONE_TASK_STATUSES } from "@/lib/care"

// ОБЗОР — первый экран смены: что система нашла, что в работе и что это дало.
//
// 🔒 ЭТО НЕ АНАЛИТИКА. Аналитика отвечает «как идут дела у клиники»; обзор — «что
// мне делать сейчас и работает ли то, что мы завели». Разные вопросы, разные
// числа, и склеивать их в один экран значит не ответить ни на один.
//
// ✗ Здесь НЕ используется CTE: `WITH … SELECT` в слое данных молча возвращает
// пусто (`ANTI-PATTERNS.md`, оплачено на аналитике этим же днём).
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const OPEN = OPEN_TASK_STATUSES.map(s => `'${s}'`).join(",")
const DONE = DONE_TASK_STATUSES.map(s => `'${s}'`).join(",")

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  try {
    const row = (await db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM care_tasks WHERE status IN (${OPEN}) AND due_date <= date('now')) AS dueToday,
           (SELECT COUNT(*) FROM care_tasks WHERE status IN (${OPEN}) AND due_date < date('now'))  AS overdue,
           (SELECT COUNT(*) FROM care_tasks WHERE status IN (${OPEN}))                             AS openTasks,
           (SELECT COUNT(*) FROM care_tasks WHERE status = 'booked')                               AS booked,
           (SELECT COUNT(*) FROM care_tasks WHERE status IN (${DONE}))                             AS doneTasks,
           (SELECT COUNT(*) FROM care_scenarios WHERE is_active = 1)                               AS activeRules,
           (SELECT COUNT(*) FROM care_scenarios)                                                   AS allRules,
           (SELECT COUNT(*) FROM care_people)                                                      AS people,
           (SELECT COUNT(*) FROM care_people WHERE consent_to_contact = 0)                         AS refused,
           (SELECT COUNT(*) FROM care_messages WHERE direction = 'incoming')                       AS incoming`,
      )
      .get()) as Record<string, number> | undefined

    const n = (k: string) => Number(row?.[k] ?? 0)
    const doneTasks = n("doneTasks")
    const booked = n("booked")

    // Последняя синхронизация — чтобы было видно, свежие ли данные вообще.
    const last = (await db
      .prepare(
        `SELECT created_at FROM care_activity_log
          WHERE action = 'crm_sync' ORDER BY created_at DESC LIMIT 1`,
      )
      .get()) as { created_at: string } | undefined

    return NextResponse.json({
      ok: true,
      queue: { dueToday: n("dueToday"), overdue: n("overdue"), open: n("openTasks") },
      result: {
        booked,
        done: doneTasks,
        // 🔒 ДОЛЯ ТОЛЬКО ПРИ ЗАКРЫТЫХ ЗАДАЧАХ. 0 из 0 — это «судить не по чему»,
        // а не «ноль процентов»: показать ноль значит объявить работу бесполезной
        // до того, как она началась.
        conversion: doneTasks > 0 ? Math.round((booked / doneTasks) * 100) : null,
      },
      rules: { active: n("activeRules"), all: n("allRules") },
      base: { people: n("people"), refused: n("refused"), incoming: n("incoming") },
      lastSyncAt: last?.created_at ?? null,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
