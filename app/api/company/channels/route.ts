// @api read and update how the answer is built and instructed
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { readChannelSettings, writeChannelSettings, sourceHealth, SOURCE_NAMES, type SourceName } from "@/lib/company/channel-settings"

// НАСТРОЙКИ КАНАЛА СВЯЗИ (шаг 32).
//
// 🔒 ЖИВОСТЬ СЛУЖБ ЕДЕТ ВМЕСТЕ С НАСТРОЙКАМИ, а не отдельной дверью: экран показывает их
// в одной строке с переключателем, и два запроса ради одной строки — цена без выгоды.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied
  const [settings, health] = await Promise.all([
    Promise.resolve(readChannelSettings()),
    sourceHealth(),
  ])
  return NextResponse.json({ ok: true, settings, health })
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
  const raw = (body ?? {}) as { sources?: unknown; instruction?: unknown; testWhatsapp?: unknown; testTelegram?: unknown }

  // 🔒 ПРИНИМАЮТСЯ ТОЛЬКО ИЗВЕСТНЫЕ ИМЕНА ИСТОЧНИКОВ: иначе тело запроса становится
  // способом положить в файл настроек что угодно под любым ключом.
  const sources: Partial<Record<SourceName, boolean>> = {}
  if (raw.sources && typeof raw.sources === "object") {
    for (const n of SOURCE_NAMES) {
      const v = (raw.sources as Record<string, unknown>)[n]
      if (typeof v === "boolean") sources[n] = v
    }
  }

  const settings = writeChannelSettings({
    sources: sources as Record<SourceName, boolean>,
    instruction: typeof raw.instruction === "string" ? raw.instruction : undefined,
    testWhatsapp: typeof raw.testWhatsapp === "string" ? raw.testWhatsapp : undefined,
    testTelegram: typeof raw.testTelegram === "string" ? raw.testTelegram : undefined,
  })
  return NextResponse.json({ ok: true, settings })
}
