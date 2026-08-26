// @api read the state of integration keys and update them
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { keyStates, writeKeys, KEY_NAMES, type KeyName } from "@/lib/company/keys"

// КЛЮЧИ ИНТЕГРАЦИЙ.
//
// 🔒 ОТДЕЛЬНАЯ ДВЕРЬ, А НЕ ПОЛЕ В `PUT /api/company`, и это не аккуратность ради
// аккуратности. У названия компании и у ключа OpenAI разная цена ошибки: первое видно всем
// и правится обратно, второй открывает доступ к чужому счёту. Разные двери — разные
// журналы, разные проверки и разный разговор, когда придётся разбирать, кто что менял.
//
// 🔒 `GET` НЕ ОТДАЁТ НИ ОДНОГО ЗНАЧЕНИЯ. Только «задан / не задан», источник и последние
// четыре знака. Ключ, ушедший в браузер, живёт в истории, в кеше устройства и в любом
// расширении, читающем страницу; вернуть его туда «чтобы удобно править» — значит раздать.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied
  return NextResponse.json({ ok: true, keys: keyStates() })
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
  const raw = (body ?? {}) as Record<string, unknown>

  // 🔒 ПРИНИМАЮТСЯ ТОЛЬКО ИЗВЕСТНЫЕ ИМЕНА. Иначе тело запроса становится способом положить
  // в файл что угодно под любым именем — а файл потом читают как источник настроек.
  const patch: Partial<Record<KeyName, string | null>> = {}
  for (const name of KEY_NAMES) {
    if (!(name in raw)) continue
    const v = raw[name]
    if (v === null) { patch[name] = null; continue }
    if (typeof v === "string") patch[name] = v.slice(0, 500)
  }

  try {
    writeKeys(patch)
    // 🔒 СОСТОЯНИЕ СНИМАЕТСЯ ЗАНОВО, А НЕ СОБИРАЕТСЯ ИЗ ТОГО, ЧТО ПРИСЛАЛИ (закон ⑰):
    // «пустое не меняем» и «стереть» дают разный итог, и отчёт об операции его не знает.
    return NextResponse.json({ ok: true, keys: keyStates() })
  } catch (e) {
    // 🔒 ТЕКСТ ОШИБКИ НАРУЖУ НЕ УХОДИТ. Сообщение файловой системы несёт полный путь, а
    // иногда и содержимое; здесь оно попало бы в браузер. В журнал — да, в ответ — нет.
    console.error("[company] ключи не записаны:", e)
    return NextResponse.json({ ok: false, error: "writeFailed" }, { status: 502 })
  }
}
