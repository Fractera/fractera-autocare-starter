// @api read conversation threads grouped by phone number
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { messageThreads, threadOf, messagesSummary } from "@/lib/care/messages"

// ПЕРЕПИСКА. Читает весь персонал: разговор ведёт оператор, а не администратор.
//
// 🔒 ОДНА ДВЕРЬ НА СПИСОК И НА ВЕТКУ. С `?phone=` отдаётся разговор целиком, без
// него — список веток. Разделять их на два маршрута незачем: это один предмет,
// и правило доступа у них общее.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const phone = new URL(req.url).searchParams.get("phone")?.trim()

  try {
    if (phone) {
      const messages = await threadOf(phone)
      // Пустая ветка — не ошибка: номер мог быть очищен или прислан по опечатке.
      return NextResponse.json({ ok: true, phone, messages })
    }
    const [threads, summary] = await Promise.all([messageThreads(), messagesSummary()])
    return NextResponse.json({ ok: true, threads, summary })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
