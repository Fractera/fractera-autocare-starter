// @api list add and remove company knowledge base documents
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { learn, knowledgeDocuments, knowledgeReady } from "@/lib/fractera/knowledge"
import { dataFetch } from "@/lib/fractera/data-service"

// БАЗА ЗНАНИЙ КОМПАНИИ (шаг 33).
//
// 🔒 КЛЮЧА ДВИЖКА ЗДЕСЬ НЕТ И НЕ БУДЕТ. Обращение идёт через слой данных, который сам
// подставляет ключ на петле сервера; движок в интернет не опубликован. Поэтому в блоке
// ключей интеграций поля для RAG не появилось — и это не забывчивость.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * 🔒 ТОЛЬКО ТЕКСТ И MARKDOWN — решение владельца 2026-08-25: «для работы с другими
 * форматами требую, чтобы люди использовали конвертер… рекомендован Markdown».
 *
 * Разборки PDF и DOCX в проекте нет. Приняв их, мы положили бы в граф мусор из служебной
 * разметки — и узнали бы об этом не ошибкой, а кривыми ответами модели через неделю.
 */
const ALLOWED = [".txt", ".md", ".markdown"]

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied
  const [ready, documents] = await Promise.all([knowledgeReady(), knowledgeDocuments()])
  return NextResponse.json({ ok: true, ready, documents })
}

export async function POST(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "badJson" }, { status: 400 })
  }
  const { name, text } = (body ?? {}) as { name?: unknown; text?: unknown }
  const source = String(name ?? "").trim()
  const content = String(text ?? "").trim()

  if (!source) return NextResponse.json({ ok: false, error: "noName" }, { status: 400 })
  if (!ALLOWED.some(e => source.toLowerCase().endsWith(e))) {
    return NextResponse.json({ ok: false, error: "badType" }, { status: 400 })
  }
  if (!content) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 })

  // 🔒 ПРОВЕРКА ТИПА СТОИТ И НА СЕРВЕРЕ. Ограничение, живущее в поле выбора файла, снимается
  // вкладкой разработчика; а сюда приходит текст, который модель будет читать за деньги.
  const result = await learn(content, source)
  if (!result.accepted) return NextResponse.json({ ok: false, error: "refused" }, { status: 502 })

  // 🔒 «ПРИНЯТО» — НЕ «ГОТОВО». Граф строится в фоне, и вопрос через секунду честно ответит
  // «ничего не найдено». Экран обязан показать состояние обработки, а не успех.
  return NextResponse.json({ ok: true, accepted: true, source })
}

export async function DELETE(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  const id = new URL(req.url).searchParams.get("id")?.trim()
  // 🔒 УДАЛЯЕМ ПО ИДЕНТИФИКАТОРУ, А НЕ ПО ИМЕНИ: имя набрал человек, идентификатор выдал
  // движок — и только он различает два документа с одинаковым названием.
  if (!id) return NextResponse.json({ ok: false, error: "noId" }, { status: 400 })

  try {
    await dataFetch("/service/rag/documents/delete_document", {
      method: "DELETE",
      body: JSON.stringify({ doc_ids: [id], delete_file: false }),
    })
    // 🔒 УДАЛЕНИЕ АСИНХРОННО, И ОТВЕТ ДВИЖКА — «НАЧАТО», А НЕ «СДЕЛАНО». Поэтому список
    // ПЕРЕЧИТЫВАЕТСЯ, а не правится на экране: иначе документ исчезнет из списка и вернётся
    // при следующей загрузке страницы.
    return NextResponse.json({ ok: true, started: true, documents: await knowledgeDocuments() })
  } catch (e) {
    console.error("[knowledge] удаление не начато:", e)
    return NextResponse.json({ ok: false, error: "refused" }, { status: 502 })
  }
}
