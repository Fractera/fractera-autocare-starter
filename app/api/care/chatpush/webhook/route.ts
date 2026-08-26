// @api receive incoming client messages from the channel service
import { NextRequest, NextResponse } from "next/server"
import { receiveInbound, receiveStatus } from "@/lib/care/inbound"
import { integrationKey } from "@/lib/company/keys"

// ВХОДЯЩИЕ СООБЩЕНИЯ. Сюда стучится служба каналов, а не человек.
//
// 🔒 ✗ В ИСХОДНИКЕ ЭТА ДВЕРЬ БЫЛА ОТКРЫТА НАСТЕЖЬ — ни секрета, ни подписи, ни проверки
// источника. Любой, кто знает адрес, кладёт в базу клиники выдуманные сообщения; а так как
// исходник на них ещё и ОТВЕЧАЛ моделью, чужой человек мог заставить клинику написать
// живому пациенту что угодно. Здесь стоит общий секрет — тот же приём, что у двери
// каналов Telegram.
//
// 🔒 ПУСТОЙ СЕКРЕТ ЗАКРЫВАЕТ ДВЕРЬ НАГЛУХО, А НЕ ОТКРЫВАЕТ ВСЕМ. Ненастроенный канал
// отвечает `503`, и это честно: принимать сообщения, не умея отличить службу от прохожего,
// хуже, чем не принимать их вовсе.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const secret = integrationKey("CHATPUSH_HOOK_SECRET")
  if (!secret) return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 })
  // 🔒 СЕКРЕТ ПРИНИМАЕТСЯ И ЗАГОЛОВКОМ, И ПАРАМЕТРОМ АДРЕСА — потому что ChatPush
  // ЗАГОЛОВКОВ НЕ УМЕЕТ. Проверено у самой службы: объект вебхука состоит из трёх полей —
  // id, types, url, — и места для секрета или заголовка в нём нет вовсе.
  //
  // ✗ МОЯ ПЕРВАЯ РЕДАКЦИЯ ТРЕБОВАЛА ТОЛЬКО ЗАГОЛОВОК, и она отвергала бы КАЖДОЕ входящее
  // сообщение. Дверь выглядела бы исправной (401 — «ты не служба»), а пациенты писали бы в
  // пустоту. Я взял приём у соседней двери каналов, не проверив, умеет ли ЭТА служба то же
  // самое.
  //
  // 🔒 ЦЕНА ПАРАМЕТРА В АДРЕСЕ НАЗВАНА ВСЛУХ: полный URL попадает в журналы веб-сервера,
  // то есть секрет там виден. Это приемлемо для пропуска вебхука и НЕ приемлемо было бы
  // для ключа доступа: сменить его — одна правка настройки, и он не открывает ничего,
  // кроме приёма сообщений. Заголовок оставлен первым: служба, которая его умеет, не
  // должна платить за ту, которая не умеет.
  const given = req.headers.get("x-channel-secret") ?? new URL(req.url).searchParams.get("s") ?? ""
  if (given !== secret) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 })
  }

  const payload = await req.json().catch(() => ({}))

  // 🔒 ОТКАЗ ОБРАБОТКИ НЕ ДОЛЖЕН ЛОМАТЬ ОТВЕТ СЛУЖБЕ (перенесено из исходника — там это
  // объяснено верно): ответив ошибкой, мы получим повторную доставку того же события, и
  // так по кругу. Наша беда остаётся нашей.
  try {
    // 🔒 СОБЫТИЕ О СТАТУСЕ РАЗБИРАЕТСЯ ПЕРВЫМ. Оно приходило к нам с самого начала и
    // молча выбрасывалось: обработчик знал только входящие сообщения, и поэтому в базе
    // стояло «отправлено» на том, что служба не смогла доставить.
    const status = await receiveStatus(payload)
    if (status.updated) return NextResponse.json({ ok: true, kind: "status", ...status })

    const result = await receiveInbound(payload)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error("[care] входящее не разобрано:", e)
    return NextResponse.json({ ok: true, stored: false, reason: "error" })
  }
}
