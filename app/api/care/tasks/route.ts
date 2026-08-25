// @api list the contact queue with scope filters and counts
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { getSession } from "@/lib/auth/get-session"
import { tasksPage, tasksCount, taskCounts, TASK_SCOPES, PAGE_SIZES, DEFAULT_PAGE_SIZE, type TaskScope } from "@/lib/care"
import { createTasks, logTaskEvent } from "@/lib/care/tasks"

// ОЧЕРЕДЬ КОНТАКТОВ — кому и по какому поводу написать.
//
// 🔒 ГЕЙТ НЕ МЯГЧЕ СТРАНИЦЫ: тот же `PROTECTED_GROUP_ROLES.staff` из одного
// источника, что у списка людей и карточки.
//
// 🔒 СЧЁТЧИКИ ВКЛАДОК ЕДУТ ВМЕСТЕ СО СПИСКОМ, а не отдельным запросом. Иначе
// вкладка обещала бы одно число, а список под ней показывал другое — они были бы
// сняты в разные моменты.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const url = new URL(req.url)
  const asked = url.searchParams.get("scope")
  // Отбор — из закрытого перечня: значение из адреса решает, какой WHERE уйдёт
  // в запрос, и принимать его как есть нельзя.
  const scope: TaskScope = (TASK_SCOPES as readonly string[]).includes(asked ?? "")
    ? (asked as TaskScope)
    : "today"

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const askedSize = Number(url.searchParams.get("perPage"))
  const perPage = (PAGE_SIZES as readonly number[]).includes(askedSize) ? askedSize : DEFAULT_PAGE_SIZE

  try {
    const [tasks, total, counts] = await Promise.all([
      tasksPage({ scope, limit: perPage, offset: (page - 1) * perPage }),
      tasksCount(scope),
      taskCounts(),
    ])
    return NextResponse.json({ ok: true, tasks, total, counts, scope, page, perPage })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}

/**
 * Завести задачи выбранным людям.
 *
 * 🔒 ТРИ ПРЕДОХРАНИТЕЛЯ РАБОТАЮТ В `lib/care/tasks.ts`, А НЕ ЗДЕСЬ. Дверь —
 * место, где читают сессию и проверяют право; правило «кому можно завести
 * задачу» принадлежит предметной модели. Продублируй его в маршруте — и таймер
 * ядра, который однажды позовёт ту же функцию мимо HTTP, пойдёт без
 * предохранителей.
 *
 * 🔒 ОТВЕТ НАЗЫВАЕТ КАЖДЫЙ ОТКАЗ ОТДЕЛЬНО. «Создано 12 из 459» без разбивки
 * читается как поломка; с разбивкой — как работа защиты.
 */
export async function POST(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const ids: unknown = body?.personIds
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ ok: false, error: "не выбран ни один человек" }, { status: 400 })
  }
  // Предел пачки — из исходника. Он же защита от запроса произвольного размера.
  if (ids.length > 1000) {
    return NextResponse.json({ ok: false, error: "за раз можно не больше 1000" }, { status: 400 })
  }

  try {
    const report = await createTasks(ids.map(String), {
      scenarioId: typeof body.scenarioId === "string" ? body.scenarioId : null,
      dueDate: typeof body.dueDate === "string" ? body.dueDate : undefined,
      assignee: typeof body.assignee === "string" ? body.assignee : null,
    })

    const who = (await getSession(req))?.userId ?? "unknown"
    await logTaskEvent(who, "tasks_created", { metadata: report })

    return NextResponse.json({ ok: true, ...report })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
