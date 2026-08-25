// @api compute revenue recency attendance and top services
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { careAnalytics } from "@/lib/care/analytics"

// АНАЛИТИКА. Читает весь персонал: разрезы по услугам и мастерам нужны тем, кто
// работает, а не только владельцу.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied
  try {
    return NextResponse.json({ ok: true, ...(await careAnalytics()) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
