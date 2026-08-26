// @api rewrite dictated speech into a structured readable instruction
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { openAiKey } from "@/lib/openai-key"

// «УЛУЧШИТЬ АВТОМАТИЧЕСКИ» — превращает надиктованную речь в связную инструкцию (шаг 32).
//
// 🔒 ЗАДАНИЕ МОДЕЛИ — СЛОВА ВЛАДЕЛЬЦА, а не мой пересказ (Рома, 2026-08-25): «тебе
// загрузили текст встречи, это может быть текст, который структурирован, который может
// содержать ошибки, которые может быть потеряна смысловая нить; твоя задача восстановить
// эту речь, сделать её осмысленной и структурированной».
//
// 🔒 УЛУЧШЕННОЕ НЕ ЗАМЕЩАЕТ ИСХОДНОЕ. Дверь возвращает новый текст, а старый остаётся на
// экране рядом: модель иногда «причёсывает» до потери смысла, а это инструкция, по которой
// продукт будет говорить с пациентами.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SYSTEM = [
  "Тебе загрузили текст встречи или надиктованную речь.",
  "Он может быть плохо структурирован, содержать ошибки распознавания и обрывы мысли.",
  "Твоя задача — восстановить эту речь: сделать её осмысленной и структурированной.",
  "",
  "Правила:",
  "— НИЧЕГО НЕ ПРИДУМЫВАЙ. Нет мысли в исходнике — нет её и в ответе.",
  "— Сохрани все распоряжения, числа, названия и имена дословно.",
  "— Убери слова-паразиты, повторы и оговорки распознавания.",
  "— Раздели на смысловые части; где перечисление — сделай список.",
  "— Отвечай на языке исходника.",
  "— Верни ТОЛЬКО получившийся текст, без предисловий и пояснений.",
].join("\n")

export async function POST(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  const key = openAiKey()
  // 🔒 «КЛЮЧА НЕТ» — ОТДЕЛЬНЫЙ ОТВЕТ, А НЕ ПОЛОМКА. Экран скажет, где его вписать, вместо
  // невнятного «не удалось».
  if (!key) return NextResponse.json({ ok: false, error: "no-key" }, { status: 503 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "badJson" }, { status: 400 })
  }
  const text = String((body as { text?: unknown })?.text ?? "").trim()
  if (!text) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 })

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text.slice(0, 20000) },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
    if (!res.ok) {
      // Текст чужой ошибки наружу не отдаём целиком: он несёт подробности учётной записи.
      console.error("[improve-text] модель отказала:", data?.error?.message)
      return NextResponse.json({ ok: false, error: "refused" }, { status: 502 })
    }
    const improved = data.choices?.[0]?.message?.content?.trim() ?? ""
    if (!improved) return NextResponse.json({ ok: false, error: "empty-answer" }, { status: 502 })
    return NextResponse.json({ ok: true, improved })
  } catch (e) {
    console.error("[improve-text] модель недоступна:", e)
    return NextResponse.json({ ok: false, error: "unreachable" }, { status: 502 })
  }
}
