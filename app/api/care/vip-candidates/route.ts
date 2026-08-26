// @api rank the most valuable people as candidates for vip
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { db } from "@/lib/db"
import { listRequests, openRequestCount } from "@/lib/care/client-requests"

// КАНДИДАТЫ В VIP — самые ценные люди учреждения.
//
// 🔒 РОЛЬ `vip_user` ЖИВЁТ В СЛУЖБЕ АВТОРИЗАЦИИ `:3001`, А НЕ ЗДЕСЬ. Своей
// таблицы учётных записей у нас нет и заводить её нельзя: вторая копия людей
// разошлась бы с первой в тот день, когда кто-то сменит почту.
//
// 🔒 ПОЭТОМУ ЭТОТ ЭКРАН ОТВЕЧАЕТ НА ВОПРОС «КОМУ ДАВАТЬ», А НЕ «ДАЁТ». Человек в
// CRM и учётная запись на сайте — разные сущности, и связи между ними в данных
// НЕТ: почта заполнена у 242 из 1844. Молча сделать вид, что связь есть, значило
// бы построить назначение роли на догадке по почте и однажды выдать VIP не тому.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 30))

  try {
    const rows = await db
      .prepare(
        `SELECT p.id, p.full_name, p.phone, p.email, p.consent_to_contact,
                COALESCE(v.visits, 0)  AS visits,
                COALESCE(v.revenue, 0) AS revenue,
                v.last_visit
           FROM care_people p
           LEFT JOIN (
             SELECT person_id,
                    COUNT(DISTINCT yclients_record_id) AS visits,
                    COALESCE(SUM(service_cost), 0)     AS revenue,
                    MAX(CASE WHEN visit_date <= date('now') AND attendance = 1 THEN visit_date END) AS last_visit
               FROM care_visits WHERE person_id IS NOT NULL GROUP BY person_id
           ) v ON v.person_id = p.id
          WHERE COALESCE(v.revenue, 0) > 0
          ORDER BY v.revenue DESC, p.id
          LIMIT ?`,
      )
      .all(limit)

    // Сколько людей вообще имеет почту — этим числом экран объясняет, почему
    // назначение роли нельзя сделать отсюда пачкой.
    const link = (await db
      .prepare(
        `SELECT COUNT(*) AS withEmail, (SELECT COUNT(*) FROM care_people) AS total
           FROM care_people WHERE COALESCE(email,'') <> ''`,
      )
      .get()) as { withEmail: number; total: number } | undefined

    // 🔒 ЗАЯВКИ ЕДУТ ТОЙ ЖЕ ДВЕРЬЮ, ЧТО И КАНДИДАТЫ, И ЭТО НЕ ЭКОНОМИЯ ЗАПРОСА. Экран
    // отвечает на ОДИН вопрос — «кому давать роль клиента», — и у него две стороны:
    // кандидаты, которых выбрали мы по выручке, и люди, попросившие сами. Развести их по
    // двум дверям значило бы, что экран собирает свой предмет из кусков.
    const [requests, openRequests] = await Promise.all([listRequests(), openRequestCount()])

    return NextResponse.json({
      ok: true,
      candidates: rows,
      requests,
      openRequests,
      link: { withEmail: Number(link?.withEmail ?? 0), total: Number(link?.total ?? 0) },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
