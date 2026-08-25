// @api read one person with their case and visit history
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { personById, visitsOf } from "@/lib/care"

// ОДИН ЧЕЛОВЕК: личность, дело и история визитов.
//
// 🔒 ГЕЙТ НЕ МЯГЧЕ СТРАНИЦЫ — тот же `PROTECTED_GROUP_ROLES.staff`, что и у
// списка, из одного источника.
//
// 🔒 ЗДЕСЬ ЛИЧНОСТЬ ОТДАЁТСЯ, И ЭТО НЕ ОТМЕНА ПРАВИЛА ШАГА 10, А ЕГО СМЫСЛ.
// В СПИСКЕ внутренняя заметка не нужна никому и потому не уезжает. На КАРТОЧКЕ
// оператор работает с конкретным человеком: имя, телефон и заметка — это ровно
// то, ради чего карточку открывают. Правило говорит «личность не разбросана по
// всем ответам», а не «личность не показывается никогда».
//
// ✗ Приём исходника, который здесь НЕ повторяется: там ИМЯ пациента уезжало во
// внешнюю модель вместе с текстом обращения. Отсюда данные идут только на экран
// сотрудника этого учреждения.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const { id } = await ctx.params

  try {
    const person = await personById(id)

    // 🔒 НЕТ ЧЕЛОВЕКА — `404`, А НЕ ПУСТАЯ КАРТОЧКА. Пустая карточка выглядит
    // как человек без визитов и без телефона, то есть как испорченная строка;
    // отличить её от «такого id не существует» стало бы невозможно.
    if (!person) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })

    const visits = await visitsOf(id)

    return NextResponse.json({
      ok: true,
      person: {
        id: person.id,
        full_name: person.full_name,
        phone: person.phone,
        email: person.email,
        birth_date: person.birth_date,
        consent_to_contact: person.consent_to_contact,
        comment: person.comment,
      },
      // Дело — отдельным объектом, а не вперемешку с личностью: разделение,
      // заведённое в схеме, читается и в ответе.
      care: {
        yclients_client_id: person.yclients_client_id,
        service_direction: person.service_direction,
        doctor_name: person.doctor_name,
        last_service: person.last_service,
        next_visit_date: person.next_visit_date,
        visits_success_count: person.visits_success_count,
        visits_fail_count: person.visits_fail_count,
        is_new_client: person.is_new_client,
        // Считаемое по истории, а не колонки дела: они заполнены у меньшинства
        // карточек, и отчёт по ним врал бы о трети базы.
        visits: person.visits,
        ltv: person.ltv,
        last_visit: person.last_visit,
        has_future: person.has_future,
        has_open_task: person.has_open_task,
      },
      visits,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
