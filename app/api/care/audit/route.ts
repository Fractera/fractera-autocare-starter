// @api report how trustworthy the base of people currently is
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { careAudit, lastSyncRun, lastConsentRun } from "@/lib/care"

// АУДИТ БАЗЫ — можно ли доверять цифрам, по которым принимают решения.
//
// 🔒 ДВА ИСТОЧНИКА, И ОНИ РАЗНОЙ ПРИРОДЫ. Числа базы считаются по факту прямо
// сейчас; числа прогона взяты из журнала, потому что в таблицах их нет по
// определению — пропущенного без телефона человека в базе не существует.
// Смешивать их в один список нельзя: первые отвечают «что есть», вторые «что
// потерялось по дороге».
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  try {
    const [base, sync, consent] = await Promise.all([careAudit(), lastSyncRun(), lastConsentRun()])
    // `null` — законный ответ, а не ошибка: проходов ещё не было, и экран обязан
    // сказать это словами, а не показать нули как измеренный факт.
    return NextResponse.json({ ok: true, base, sync, consent })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
