// @api read and update the clinic name and contact phone
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { readCompanySettings, writeCompanySettings } from "@/lib/company/settings"

// ДАННЫЕ УЧРЕЖДЕНИЯ. Правит только администратор: название компании видит каждый
// посетитель сайта, и право на него не мягче права на слой `(admin)`, откуда открывается
// экран. Список ролей не набран здесь руками — он в `lib/roles.ts`, откуда его читает и
// макет слоя: два места, называющие одно право разными словами, разойдутся молча.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied
  return NextResponse.json({ ok: true, settings: readCompanySettings() })
}

export async function PUT(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "badJson" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "badJson" }, { status: 400 })
  }

  const { name, shortName, phone, logo, favicon } = body as Record<string, unknown>
  const result = writeCompanySettings({
    name: typeof name === "string" ? name : "",
    shortName: typeof shortName === "string" ? shortName : "",
    phone: typeof phone === "string" ? phone : "",
    logo: typeof logo === "string" ? logo : "",
    favicon: typeof favicon === "string" ? favicon : "",
  })

  // 🔒 ОТКАЗ ВАЛИДАЦИИ — ЭТО 400, А НЕ 500. Пустое название прислал человек, а не
  // сломался сервер; интерфейсу нужно знать ПОЛЕ, чтобы подсветить именно его.
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, field: result.field }, { status: 400 })
  }
  return NextResponse.json({ ok: true, settings: result.settings })
}
