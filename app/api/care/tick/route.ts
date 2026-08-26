// @api fire scheduled messages whose due date has come
import { NextRequest, NextResponse } from "next/server"
import { tick } from "@/lib/care/dispatch"
import { integrationKey } from "@/lib/company/keys"

// ЧАСОВАЯ СТРЕЛКА ПРОДУКТА (шаг 37). Сюда стучится расписание, а не человек.
//
// 🔒 ТОТ ЖЕ СЕКРЕТ, ЧТО У ВЕБХУКА, И ТА ЖЕ ПРИЧИНА: звонит служба. Пустой секрет закрывает
// дверь наглухо (`503`), а не открывает всем — иначе любой желающий разослал бы сообщения
// пациентам клиники в три часа ночи, и окно тишины его бы не остановило: оно защищает от
// НАШЕГО расписания, а не от чужого запроса.
//
// 🔒 ЗАПРОС РАЗРЕШЁН И ЗАГОЛОВКОМ, И ПАРАМЕТРОМ АДРЕСА — как у вебхука. Планировщики
// бывают разные, и требовать заголовок от того, кто его не умеет, значит остаться без
// таймера (оплачено в шаге 35 на ChatPush).
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const secret = integrationKey("CHATPUSH_HOOK_SECRET")
  if (!secret) return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 })

  const given = req.headers.get("x-channel-secret") ?? new URL(req.url).searchParams.get("s") ?? ""
  if (given !== secret) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 })

  try {
    const report = await tick()
    // Отчёт возвращается целиком: расписание пишет его в свой журнал, и «сколько отложено
    // и почему» — единственный способ увидеть, что предохранители работают, а не молчат.
    return NextResponse.json({ ok: true, ...report })
  } catch (e) {
    console.error("[care] заход таймера не удался:", e)
    return NextResponse.json({ ok: false, error: "failed" }, { status: 502 })
  }
}
