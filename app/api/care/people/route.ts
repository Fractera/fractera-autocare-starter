// @api list people of the institution with search and paging
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { peoplePage, peopleCount, PAGE_SIZES, DEFAULT_PAGE_SIZE } from "@/lib/care"

// СПИСОК ЛЮДЕЙ УЧРЕЖДЕНИЯ. Строки принадлежат нам: они лежат в `care_people` и
// `care_cases` этого приложения, а не в чужой службе.
//
// 🔒 ПОЧЕМУ ДВЕРЬ, А НЕ ЗАПРОС ПРЯМО СО СТРАНИЦЫ. Оболочка `/ru/patients`
// обязана остаться предрендеренной, а чтение сессии (`headers()`, cookie) в
// серверном компоненте делает динамическим ВЕСЬ защищённый слой. Поэтому данные
// забирает островок, а дверь — то место, где сессию читают законно.
//
// 🔒 ГЕЙТ НЕ МЯГЧЕ СТРАНИЦЫ. Страница живёт в группе `(staff)`, и дверь берёт
// ровно тот же список ролей из одного источника — `PROTECTED_GROUP_ROLES.staff`.
// Переписать роли здесь строкой значило бы завести второй источник правды: он
// разойдётся с первым в тот день, когда в группу добавят роль.
//
// 🔒 В CRM ЭТА ДВЕРЬ НЕ ХОДИТ. Экран читает только свои таблицы; обращение к
// YCLIENTS отсюда было бы дефектом — наполнение делает синхронизация, и у неё
// своя дверь со своим, более строгим правом.
export const runtime = "nodejs"

// Ответ зависит от сессии и от содержимого базы — кэшировать нечего.
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)

  // 🔒 РАЗМЕР СТРАНИЦЫ — ИЗ ЗАКРЫТОГО НАБОРА, И ПРОВЕРЯЕТСЯ ЗДЕСЬ. Число из
  // адреса уходит в SQL: `LIMIT ?`. Принять его как есть означало бы позволить
  // любому попросить `LIMIT 100000` и вытащить всю базу людей одним запросом.
  const asked = Number(url.searchParams.get("perPage"))
  const perPage = (PAGE_SIZES as readonly number[]).includes(asked) ? asked : DEFAULT_PAGE_SIZE

  // Строка поиска обрезается: она едет в `LIKE` параметром, но неограниченная
  // длина — это чужой запрос произвольного размера в нашей базе.
  const q = url.searchParams.get("q")?.trim().slice(0, 100) || undefined

  try {
    // Счёт и страница берутся ОДНИМИ И ТЕМИ ЖЕ условиями — обе функции живут в
    // `lib/care`, и SQL здесь не пишется: иначе один и тот же запрос разъедется
    // по маршрутам и начнёт считать по-разному в двух местах.
    const [rows, total] = await Promise.all([
      peoplePage({ q, limit: perPage, offset: (page - 1) * perPage }),
      peopleCount(q),
    ])

    // 🔒 НАРУЖУ ИДЁТ ТО, ЧТО НУЖНО ЭКРАНУ, А НЕ СТРОКА ЦЕЛИКОМ. Внутренняя
    // заметка (`comment`) остаётся на сервере: это свободный текст, в котором
    // легко окажется то, чему не место в списке. Правило шага 10 о разделении
    // человека и дела действует и здесь.
    const people = rows.map(r => ({
      id: r.id,
      full_name: r.full_name,
      phone: r.phone,
      consent_to_contact: r.consent_to_contact,
      last_visit: r.last_visit,
      next_visit_date: r.next_visit_date,
      visits: r.visits,
      ltv: r.ltv,
      has_future: r.has_future,
      has_open_task: r.has_open_task,
    }))

    return NextResponse.json({ ok: true, people, total, page, perPage })
  } catch (e) {
    // 🔒 ПРИЧИНА НАЗЫВАЕТСЯ. Молчаливый пустой список неотличим от «в базе
    // никого нет» — а это ровно тот вопрос, ради которого экран открывают.
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
