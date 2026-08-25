// @api match one rule against people and fill the queue
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { getSession } from "@/lib/auth/get-session"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { scenarioById, scenarioCandidates } from "@/lib/care/scenarios"
import { createTasks, logTaskEvent } from "@/lib/care/tasks"

// СВЕДЕНИЕ ПРАВИЛА С ЛЮДЬМИ и наполнение очереди.
//
// 🔒 ЗАДАЧИ ЗАВОДЯТСЯ ЧЕРЕЗ `createTasks`, А НЕ СВОИМ `INSERT`. Значит все три
// предохранителя шага 14 работают и здесь. ✗ В исходнике генерация по сценариям
// имела только ДВА (согласие и открытая задача) и обходила третий — «касались
// недавно», который стоял лишь в массовом создании с экрана. Разница выглядит
// недосмотром, а не решением: правило, срабатывающее каждый день, без остывания
// пишет человеку каждый день. Здесь предохранители одни на оба пути.
//
// 🔒 GET СЧИТАЕТ, POST ЗАВОДИТ. Сначала показать число, потом дать нажать:
// «под правило подходит 412 человек» — это то, что администратор обязан увидеть
// ДО того, как очередь наполнится четырьмя сотнями задач.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

/** Сколько людей подходит под правило прямо сейчас. Ничего не меняет. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const { id } = await ctx.params
  try {
    const scenario = await scenarioById(id)
    if (!scenario) return NextResponse.json({ ok: false, error: "сценарий не найден" }, { status: 404 })

    const match = await scenarioCandidates(scenario)
    return NextResponse.json({
      ok: true,
      scenarioId: match.scenarioId,
      title: match.title,
      triggerType: match.triggerType,
      candidates: match.personIds.length,
      manual: match.manual,
      noData: match.noData,
      isActive: scenario.is_active,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}

/** Завести задачи по правилу. Право администратора: наполняет очередь пачкой. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  const { id } = await ctx.params
  try {
    const scenario = await scenarioById(id)
    if (!scenario) return NextResponse.json({ ok: false, error: "сценарий не найден" }, { status: 404 })

    // 🔒 ВЫКЛЮЧЕННОЕ ПРАВИЛО НЕ ЗАПУСКАЕТСЯ. Выключатель обязан что-то значить:
    // иначе «выключено» — это подпись, а не состояние.
    if (!scenario.is_active) {
      return NextResponse.json({ ok: false, error: "правило выключено" }, { status: 409 })
    }

    const match = await scenarioCandidates(scenario)
    if (match.manual) {
      return NextResponse.json(
        { ok: false, error: "этот триггер сводится вручную: людей выбирают на экране, а не запросом" },
        { status: 409 },
      )
    }

    const report = await createTasks(match.personIds, { scenarioId: scenario.id })
    const who = (await getSession(req))?.userId ?? "unknown"
    await logTaskEvent(who, "scenario_run", {
      metadata: { scenarioId: scenario.id, title: scenario.title, candidates: match.personIds.length, ...report },
    })

    return NextResponse.json({
      ok: true,
      scenarioId: scenario.id,
      title: scenario.title,
      candidates: match.personIds.length,
      ...report,
      ...(match.noData ? { warning: "у этого триггера нет данных на текущем филиале" } : {}),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
