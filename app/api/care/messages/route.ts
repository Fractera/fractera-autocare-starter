// @api read conversation threads grouped by phone number
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { messageThreads, threadOf, messagesSummary, sendMessage } from "@/lib/care/messages"
import { testClientPhone } from "@/lib/care/test-client"

// ПЕРЕПИСКА. Читает весь персонал: разговор ведёт оператор, а не администратор.
//
// 🔒 ОДНА ДВЕРЬ НА СПИСОК И НА ВЕТКУ. С `?phone=` отдаётся разговор целиком, без
// него — список веток. Разделять их на два маршрута незачем: это один предмет,
// и правило доступа у них общее.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Предел вложений на сообщение. Одно число на дверь и на поле ввода: два разных предела
// разойдутся, и человек узнает об этом отказом уже после выбора файлов.
const MAX_FILES = 3

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  const phone = new URL(req.url).searchParams.get("phone")?.trim()

  try {
    if (phone) {
      const messages = await threadOf(phone)
      // Пустая ветка — не ошибка: номер мог быть очищен или прислан по опечатке.
      return NextResponse.json({ ok: true, phone, messages })
    }
    // 🔒 НОМЕР ТЕСТОВОГО КЛИЕНТА ЕДЕТ ВМЕСТЕ СО СПИСКОМ. Экран обязан отличать ветку, где
    // проверяют канал, от ветки с живым пациентом: в первой пишут что угодно, во второй
    // каждое слово уходит человеку.
    const [threads, summary, testPhone] = await Promise.all([messageThreads(), messagesSummary(), testClientPhone()])
    return NextResponse.json({ ok: true, threads, summary, testPhone })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}

// ОТПРАВКА оператором.
//
// 🔒 ПРАВО ТО ЖЕ, ЧТО У ЧТЕНИЯ, И ЭТО НЕ НЕБРЕЖНОСТЬ: разговор ведёт тот же человек,
// который его читает. Разводить чтение и ответ по разным ролям значило бы, что оператор
// видит вопрос пациента и не может на него ответить.
//
// 🔒 ДВЕРЬ НЕ ОТПРАВЛЯЕТ НАРУЖУ. Канала нет (ChatPush — шаг 20), сообщение ложится в базу
// с пометкой `pending`. Ответ двери несёт `delivered: false`, чтобы экран мог сказать это
// человеку, а не изображать доставку.
export async function POST(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "badJson" }, { status: 400 })
  }
  const { phone, text, files, channel } = (body ?? {}) as {
    phone?: unknown
    text?: unknown
    files?: unknown
    channel?: unknown
  }

  const p = typeof phone === "string" ? phone.trim() : ""
  const t = typeof text === "string" ? text : ""

  // 🔒 ПРЕДЕЛ ПРОВЕРЯЕТСЯ НА СЕРВЕРЕ, А НЕ ТОЛЬКО В ПОЛЕ ВВОДА (владелец: «не более трёх
  // вложений»). Ограничение, живущее в браузере, — вежливость перед своим оператором и
  // ничто перед кем угодно ещё: адрес двери виден в любой вкладке разработчика.
  const clean: { url: string; mediaType: string; filename?: string }[] = []
  if (Array.isArray(files)) {
    for (const f of files.slice(0, MAX_FILES)) {
      const o = f as { url?: unknown; mediaType?: unknown; filename?: unknown }
      if (typeof o?.url !== "string" || !o.url) continue
      clean.push({
        url: o.url,
        mediaType: typeof o.mediaType === "string" ? o.mediaType : "application/octet-stream",
        filename: typeof o.filename === "string" ? o.filename : undefined,
      })
    }
  }

  if (!p) return NextResponse.json({ ok: false, error: "noPhone" }, { status: 400 })
  if (!t.trim() && clean.length === 0) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 })
  if (Array.isArray(files) && files.length > MAX_FILES) {
    return NextResponse.json({ ok: false, error: "tooManyFiles", max: MAX_FILES }, { status: 400 })
  }

  try {
    // Канал: принимаем только известные имена — иначе тело запроса решает, каким путём
    // сообщение уйдёт живому человеку.
    const ch = channel === "whatsapp" || channel === "telegram" ? channel : "auto"
    const message = await sendMessage(p, t, clean, ch)
    // 🪦 СКРИПТОВЫЙ ОТВЕТ «КЛИЕНТА» УДАЛЁН (шаг 30). Он существовал, пока канала не было:
    // показать вид ленты было нечем. Канал появился — и выдуманный собеседник стал вреден:
    // он отвечает там, где теперь отвечает настоящий человек.
    return NextResponse.json({ ok: true, message, delivered: message.delivery === "sent" })
  } catch (e) {
    const msg = String((e as Error).message ?? e)
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "empty" ? 400 : 502 })
  }
}
