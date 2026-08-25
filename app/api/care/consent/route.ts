// @api collect written newsletter consent from the CRM client cards
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { getSession } from "@/lib/auth/get-session"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { syncConsent, logConsentRun } from "@/lib/care/consent"

// СБОР СОГЛАСИЯ — вторая дверь к CRM, намеренно отдельная от синхронизации.
//
// 🔒 ПОЧЕМУ ОТДЕЛЬНАЯ (решение владельца 2026-08-25). Согласие лежит только в
// карточке одного клиента: обход стоит около пятнадцати минут против сорока пяти
// секунд у синхронизации. Согласие меняется редко; тянуть его каждым прогоном
// значило бы заставить таймерную цепочку ждать квадрант часа ради
// неизменившегося.
//
// 🔒 ПРАВО АДМИНИСТРАТОРА, КАК И У СИНХРОНИЗАЦИИ. Проход переписывает колонку, от
// которой зависит, кому продукт вправе написать. Право читать список и право
// решать, кому можно слать, — разные способности.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Пятнадцать минут — это осознанный предел, а не запас на всякий случай:
// 1849 карточек по одной, с паузой под лимит YCLIENTS в 5 запросов в секунду.
export const maxDuration = 1800

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  try {
    const report = await syncConsent()
    const who = (await getSession(req))?.userId ?? "unknown"
    const logFailed = await logConsentRun(who, report)

    return NextResponse.json({
      ok: true,
      ...report,
      // Правило, по которому решено молчание, называется В ОТВЕТЕ. Через месяц
      // никто не вспомнит, чем считалось отсутствие записи, а от этого зависит,
      // кому ушли сообщения.
      rule: "отсутствие записи согласия = разрешение (решение владельца 2026-08-25)",
      ...(logFailed ? { logFailed } : {}),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
