// @api list the service catalogue with how often each was given
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { servicesList, serviceCategories, servicesSummary } from "@/lib/care/services"

// КАТАЛОГ УСЛУГ. Читает весь персонал: протокол сопровождения нужен тому, кто
// разговаривает с человеком, а не только администратору.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim().slice(0, 100) || undefined
  const category = url.searchParams.get("category")?.trim().slice(0, 100) || undefined

  try {
    const [services, categories, summary] = await Promise.all([
      servicesList({ q, category }),
      serviceCategories(),
      servicesSummary(),
    ])
    return NextResponse.json({ ok: true, services, categories, summary })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
