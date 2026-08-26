// @api submit or list requests to become a clinic client
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { getSession } from "@/lib/auth/get-session"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { createRequest, myOpenRequest, listRequests } from "@/lib/care/client-requests"

// ЗАЯВКА «ХОЧУ СТАТЬ КЛИЕНТОМ».
//
// 🔒 У ДВЕРИ ДВА ХОЗЯИНА И ДВА РАЗНЫХ ПРАВА, и это не усложнение, а суть предмета:
// подаёт заявку КЛИЕНТ (`account`), разбирает её ПЕРСОНАЛ (`staff`). Свести их к одной
// роли значило бы либо пустить клиента в чужие заявки, либо запретить ему собственную.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ЧТЕНИЕ. Персонал видит все заявки; вошедший клиент — только свою.
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const roles = session.roles ?? []
  const isStaff = PROTECTED_GROUP_ROLES.staff.some(r => roles.includes(r))

  try {
    if (isStaff) {
      return NextResponse.json({ ok: true, requests: await listRequests() })
    }
    // 🔒 СВОЯ ЗАЯВКА ОТДАЁТСЯ ПО СЕССИИ, А НЕ ПО ИДЕНТИФИКАТОРУ ИЗ АДРЕСА. Приняв его
    // параметром, мы отдали бы чужую заявку всякому, кто подставит чужой номер.
    return NextResponse.json({ ok: true, mine: await myOpenRequest(session.userId) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}

// ПОДАЧА. Только вошедший; почта берётся из сессии.
export async function POST(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.account)
  if (denied) return denied

  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "badJson" }, { status: 400 })
  }
  const { fullName } = (body ?? {}) as { fullName?: unknown }

  try {
    // 🔒 ПОЧТА НЕ ЧИТАЕТСЯ ИЗ ТЕЛА ЗАПРОСА ВООБЩЕ. Она берётся у того, кто стучится:
    // иначе любой вошедший подаёт заявку от чужого имени, и менеджер свяжется не с тем.
    const result = await createRequest(
      session.userId,
      session.email ?? "",
      typeof fullName === "string" ? fullName : "",
    )
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true, request: result.request })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
