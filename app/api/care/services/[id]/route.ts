// @api edit the protocol and flags of one catalogue service
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { getSession } from "@/lib/auth/get-session"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { updateService } from "@/lib/care/services"
import { logTaskEvent } from "@/lib/care/tasks"

// ПРАВКА УСЛУГИ — право администратора, как у сценариев.
//
// 🔒 ЧТО ЗНАЧАТ ДВА ФЛАГА, РЕШЕНО ЗДЕСЬ И ЗАПИСАНО.
//
// `is_course` — курсовая процедура. ✗ В исходнике курс опознавался условием
// `service_title ILIKE '%PRP%' OR ILIKE '%биоревитал%'` прямо в двух запросах:
// названия услуг ОДНОЙ клиники жили в коде, и следующее учреждение сломало бы
// сегмент молча. Теперь это свойство строки каталога, и его ставит человек.
//
// `excluded` — не учитывать услугу в аналитике и в мере правил. ✗ В исходнике
// флаг существовал и НИГДЕ не использовался: он только красил строку бледным.
// Флаг без потребителя — это обещание, которого никто не сдержал; здесь он
// получает смысл, и смысл назван.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  const { id } = await ctx.params
  const b = await req.json().catch(() => ({}))

  try {
    const ok = await updateService(id, {
      category: b.category,
      protocolText: b.protocolText,
      isCourse: b.isCourse,
      excluded: b.excluded,
    })
    if (!ok) return NextResponse.json({ ok: false, error: "услуга не найдена" }, { status: 404 })

    const who = (await getSession(req))?.userId ?? "unknown"
    const changed = ["category", "protocolText", "isCourse", "excluded"].filter(k => b[k] !== undefined)
    await logTaskEvent(who, "service_updated", { metadata: { id, changed } })

    return NextResponse.json({ ok: true, id, changed })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
