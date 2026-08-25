// @api change the status of one task and record it
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { getSession } from "@/lib/auth/get-session"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { setTaskStatus, logTaskEvent } from "@/lib/care/tasks"
import { TASK_STATUSES, type TaskStatus } from "@/lib/care"

// СМЕНА СТАТУСА ЗАДАЧИ — то, ради чего очередь вообще существует.
//
// 🔒 ГЕЙТ НЕ МЯГЧЕ СТРАНИЦЫ: `PROTECTED_GROUP_ROLES.staff` из одного источника.
// Задачи ведёт тот же человек, который их видит; отдельного права здесь нет.
//
// 🔒 СЛЕД В ЖУРНАЛЕ ПИШЕТСЯ С `from` И `to`. Правило исходника, и оно не
// формальность: «стало „отказался“» одинаково выглядит после разговора и после
// ошибочного нажатия. Различает их только «откуда».
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const status = body?.status

  // Список закрыт, и проверка стоит ДО базы: отказ ограничения приходит как
  // «нарушение CHECK», по нему невозможно сказать человеку, что он прислал.
  if (typeof status !== "string" || !(TASK_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { ok: false, error: "неизвестный статус", allowed: TASK_STATUSES },
      { status: 400 },
    )
  }

  try {
    const res = await setTaskStatus(id, status as TaskStatus, {
      resultComment: typeof body.resultComment === "string" ? body.resultComment : null,
      finalMessage: typeof body.finalMessage === "string" ? body.finalMessage : null,
    })

    if (!res.ok) {
      // 🔒 «НЕТ ТАКОЙ ЗАДАЧИ» — `404`, А НЕ ТИХОЕ `ok`. Молчаливый успех на
      // несуществующем идентификаторе означал бы, что экран показал «сохранено»,
      // ничего не сохранив.
      return NextResponse.json({ ok: false, error: "задача не найдена" }, { status: 404 })
    }

    // Статус не изменился — писать в журнал нечего: событие «ничего не
    // произошло» засоряет след и мешает читать настоящие.
    if (res.from !== status) {
      const who = (await getSession(req))?.userId ?? "unknown"
      await logTaskEvent(who, "task_status_changed", {
        taskId: id,
        metadata: { from: res.from, to: status },
      })
    }

    return NextResponse.json({ ok: true, from: res.from, to: status })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
