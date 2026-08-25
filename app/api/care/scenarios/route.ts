// @api list and create the rules that fill the contact queue
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { getSession } from "@/lib/auth/get-session"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { scenariosList, createScenario, validateScenario, TRIGGER_TYPES, TRIGGERS_WITHOUT_DATA, type TriggerType } from "@/lib/care/scenarios"
import { logTaskEvent } from "@/lib/care/tasks"

// СЦЕНАРИИ — ядро продукта.
//
// 🔒 ПРАВО ЗДЕСЬ АСИММЕТРИЧНО, И ЭТО ЗАКОН ИСХОДНИКА, А НЕ НАША ВЫДУМКА.
// Список видит весь персонал; создать правило может ТОЛЬКО администратор.
// Сценарий решает, кому уйдут сообщения: видеть правило и менять его — разные
// способности. В исходнике это `if (s.role !== "admin") return forbidden()`
// поверх общей проверки сессии; здесь — два вызова `requireRoles` в одном файле.
//
// ✗ Соблазн упростить до одного права ломает ровно то, ради чего асимметрия
// заведена: оператор, работающий по очереди, не должен уметь переписать правило,
// которое эту очередь порождает.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  try {
    const scenarios = await scenariosList()
    return NextResponse.json({
      ok: true,
      scenarios,
      // Перечень и мёртвые триггеры едут вместе со списком: экран рисует форму
      // по ним и не обязан знать их наизусть.
      triggers: TRIGGER_TYPES,
      triggersWithoutData: TRIGGERS_WITHOUT_DATA,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}

/** Сообщение по имени изъяна. Слова здесь, а не в модели: модель не знает языка экрана. */
const PROBLEM_TEXT: Record<string, string> = {
  no_title: "укажите название правила",
  bad_trigger: "неизвестный тип триггера",
  no_goal: "укажите цель контакта — ради чего пишем человеку",
  bad_offset: "порог в днях должен быть от 0 до 3650",
}

export async function POST(req: NextRequest) {
  // 🔒 ЗАПИСЬ — ТОЛЬКО АДМИНИСТРАТОР.
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  const b = await req.json().catch(() => ({}))
  const problem = validateScenario({
    title: b.title,
    triggerType: b.triggerType,
    messageGoal: b.messageGoal,
    daysOffset: b.daysOffset,
  })
  if (problem) {
    return NextResponse.json({ ok: false, error: PROBLEM_TEXT[problem], problem }, { status: 400 })
  }

  try {
    const id = await createScenario({
      title: String(b.title),
      description: typeof b.description === "string" ? b.description : null,
      triggerType: b.triggerType as TriggerType,
      daysOffset: b.daysOffset,
      serviceDirection: typeof b.serviceDirection === "string" ? b.serviceDirection : null,
      messageGoal: String(b.messageGoal),
      isActive: b.isActive,
    })

    const who = (await getSession(req))?.userId ?? "unknown"
    await logTaskEvent(who, "scenario_created", { metadata: { id, title: b.title, trigger: b.triggerType } })

    // 🔒 ПРЕДУПРЕЖДЕНИЕ О МЁРТВОМ ТРИГГЕРЕ ЕДЕТ В ОТВЕТЕ, А НЕ ГЛОТАЕТСЯ.
    // Правило создано — запрещать владельцу его завести мы не вправе, — но
    // молчать о том, что оно не выстрелит ни разу, нельзя.
    const dead = (TRIGGERS_WITHOUT_DATA as readonly string[]).includes(b.triggerType)
    return NextResponse.json({
      ok: true,
      id,
      ...(dead ? { warning: "у этого триггера нет данных на текущем филиале — правило не сработает" } : {}),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
