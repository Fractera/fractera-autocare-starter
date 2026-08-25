// @api edit or switch off one rule of the contact queue
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { getSession } from "@/lib/auth/get-session"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { updateScenario, validateScenario, TRIGGER_TYPES, type TriggerType } from "@/lib/care/scenarios"
import { logTaskEvent } from "@/lib/care/tasks"

// ПРАВКА ПРАВИЛА — то же право, что у создания: только администратор.
//
// 🔒 ВЫКЛЮЧАТЕЛЬ, А НЕ УДАЛЕНИЕ. Выключенное правило остаётся видно вместе со
// своей мерой пользы: «породило 340 задач, из них 12 записей» — это знание, и
// стирать его вместе со строкой значит терять единственное основание судить,
// стоило ли правило заводить. Удаления у сценариев нет намеренно.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PROBLEM_TEXT: Record<string, string> = {
  no_title: "укажите название правила",
  bad_trigger: "неизвестный тип триггера",
  no_goal: "укажите цель контакта — ради чего пишем человеку",
  bad_offset: "порог в днях должен быть от 0 до 3650",
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  const { id } = await ctx.params
  const b = await req.json().catch(() => ({}))

  // 🔒 ПРОВЕРЯЕТСЯ ТОЛЬКО ПРИСЛАННОЕ. Правка может касаться одного поля, и
  // требовать при этом заполненности остальных значило бы заставить экран
  // присылать всю форму ради переключения выключателя.
  if (b.title !== undefined && !String(b.title).trim()) {
    return NextResponse.json({ ok: false, error: PROBLEM_TEXT.no_title, problem: "no_title" }, { status: 400 })
  }
  if (b.messageGoal !== undefined && !String(b.messageGoal).trim()) {
    return NextResponse.json({ ok: false, error: PROBLEM_TEXT.no_goal, problem: "no_goal" }, { status: 400 })
  }
  if (b.triggerType !== undefined && !(TRIGGER_TYPES as readonly string[]).includes(b.triggerType)) {
    return NextResponse.json(
      { ok: false, error: PROBLEM_TEXT.bad_trigger, problem: "bad_trigger", allowed: TRIGGER_TYPES },
      { status: 400 },
    )
  }
  if (b.daysOffset !== undefined) {
    const problem = validateScenario({ title: "x", triggerType: "after_visit", messageGoal: "x", daysOffset: b.daysOffset })
    if (problem) return NextResponse.json({ ok: false, error: PROBLEM_TEXT.bad_offset, problem }, { status: 400 })
  }

  try {
    const res = await updateScenario(id, {
      title: b.title,
      description: b.description,
      triggerType: b.triggerType as TriggerType | undefined,
      daysOffset: b.daysOffset,
      serviceDirection: b.serviceDirection,
      messageGoal: b.messageGoal,
      isActive: b.isActive,
    })
    if (!res.ok) return NextResponse.json({ ok: false, error: "сценарий не найден" }, { status: 404 })

    // 🔒 В ЖУРНАЛ ИДЁТ, ЧТО ИМЕННО ПОМЕНЯЛОСЬ. «Правило изменено» без полей
    // бесполезно: через месяц никто не скажет, кто и когда его выключил.
    const who = (await getSession(req))?.userId ?? "unknown"
    const changed = Object.keys(b).filter(k => b[k] !== undefined)
    await logTaskEvent(who, "scenario_updated", {
      metadata: {
        id,
        changed,
        ...(b.isActive !== undefined ? { activeFrom: res.before.is_active, activeTo: b.isActive ? 1 : 0 } : {}),
      },
    })

    return NextResponse.json({ ok: true, id, changed })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
