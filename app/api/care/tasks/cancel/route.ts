// @api cancel selected or all pending outgoing tasks
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { db } from "@/lib/db"

// ОТМЕНА ЗАДАЧ ИЗ ОЧЕРЕДИ — заказ Ромы 2026-08-25.
//
// 🔒 ЗАЧЕМ ЭТО СРОЧНО. В очереди 96 задач с наступившим сроком, а таймер уже стоит на
// бою. Опасение владельца дословно: «может случиться так, что мы будем ещё баловаться, а
// все эти сообщения улетят к клиентам». Отмена — вторая защита после рубильника: первый
// не даёт уйти всему, вторая убирает конкретное.
//
// 🔒 ЗАДАЧИ НЕ УДАЛЯЮТСЯ, А ПОЛУЧАЮТ СТАТУС `declined`. След того, что правило сработало
// и человека решили не беспокоить, обязан пережить отмену: иначе следующий прогон правила
// заведёт ту же задачу заново, и так по кругу. Статус уже есть в схеме с шага 10.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "badJson" }, { status: 400 })
  }
  const { ids, all } = (body ?? {}) as { ids?: unknown; all?: unknown }

  try {
    // 🔒 «ВСЁ» И «ВЫБРАННОЕ» — РАЗНЫЕ ВЕТКИ, А НЕ ОДНА С ПУСТЫМ СПИСКОМ. Пустой список,
    // истолкованный как «все», — это ровно тот случай, когда сбой интерфейса отменяет всю
    // очередь. Намерение стереть всё выражается ОТДЕЛЬНЫМ признаком.
    if (all === true) {
      const before = (await db
        .prepare(`SELECT COUNT(*) AS n FROM care_tasks WHERE status IN ('new','in_progress','postponed')`)
        .get()) as { n?: number } | undefined

      await db
        .prepare(
          `UPDATE care_tasks
              SET status = 'declined',
                  result_comment = COALESCE(result_comment, 'Рассылка отменена вручную'),
                  updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
            WHERE status IN ('new','in_progress','postponed')`,
        )
        .run()

      // 🔒 СОСТОЯНИЕ СНИМАЕТСЯ ЗАПРОСОМ ПОСЛЕ ПРАВКИ, а не считается по отчёту операции
      // (закон ⑰): отчёт говорит, сколько строк тронули, а не сколько осталось.
      const left = (await db
        .prepare(`SELECT COUNT(*) AS n FROM care_tasks WHERE status IN ('new','in_progress','postponed')`)
        .get()) as { n?: number } | undefined

      return NextResponse.json({ ok: true, cancelled: Number(before?.n ?? 0), left: Number(left?.n ?? 0) })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: "nothing" }, { status: 400 })
    }
    const list = ids.filter(x => typeof x === "string").slice(0, 500) as string[]
    if (!list.length) return NextResponse.json({ ok: false, error: "nothing" }, { status: 400 })

    const marks = list.map(() => "?").join(",")
    await db
      .prepare(
        // Отменяются только те, что ЕЩЁ не ушли: у задачи со статусом `contacted`
        // сообщение уже у человека, и «отмена» здесь была бы враньём на экране.
        `UPDATE care_tasks
            SET status = 'declined',
                result_comment = COALESCE(result_comment, 'Рассылка отменена вручную'),
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
          WHERE id IN (${marks}) AND status IN ('new','in_progress','postponed')`,
      )
      .run(...list)

    const left = (await db
      .prepare(`SELECT COUNT(*) AS n FROM care_tasks WHERE status IN ('new','in_progress','postponed')`)
      .get()) as { n?: number } | undefined

    return NextResponse.json({ ok: true, cancelled: list.length, left: Number(left?.n ?? 0) })
  } catch (e) {
    console.error("[tasks] отмена не удалась:", e)
    return NextResponse.json({ ok: false, error: "failed" }, { status: 502 })
  }
}
