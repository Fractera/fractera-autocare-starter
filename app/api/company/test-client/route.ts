// @api create or remove the test client used to check the channel
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { createTestClient, removeTestClients, testClientPhone } from "@/lib/care/test-client"

// ТЕСТОВЫЙ КЛИЕНТ (шаг 30).
//
// 🔒 ПРАВО `admin`, А НЕ `staff`. Кнопка создаёт СТРОКИ В ОБЩЕЙ БАЗЕ — те же таблицы, из
// которых считаются деньги и берутся люди для рассылки. Это действие владельца настроек, а
// не оператора смены.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied
  return NextResponse.json({ ok: true, phone: await testClientPhone() })
}

export async function POST(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "badJson" }, { status: 400 })
  }
  const { phone } = (body ?? {}) as { phone?: unknown }

  try {
    const result = await createTestClient(typeof phone === "string" ? phone : "")
    if (!result.ok) return NextResponse.json(result, { status: 400 })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied
  try {
    // 🔒 ВОЗВРАЩАЕТСЯ СОСТОЯНИЕ ПОСЛЕ УДАЛЕНИЯ, СНЯТОЕ ЗАПРОСОМ, а не число удалённых:
    // отчёт операции не есть состояние базы (закон ⑰).
    return NextResponse.json({ ok: true, left: await removeTestClients() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
