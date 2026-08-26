import "server-only"
import { db } from "@/lib/db"
import { openAiKey } from "@/lib/openai-key"
import { readChannelSettings } from "@/lib/company/channel-settings"
import { getAppConfig } from "@/config/app-config"

// СОСТАВЛЕНИЕ ТЕКСТА СООБЩЕНИЯ — звено, которого не было (шаг 37).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА: ТЕКСТ УХОДИТ БЕЗ ПОДТВЕРЖДЕНИЯ ЧЕЛОВЕКА (§3.39 паспорта).
// Рекомендация исполнителя была другой; раз человека в цепи нет, его работу делают
// правила — и они стоят здесь же, а не откладываются.
//
// 🔒 ЧЕГО МОДЕЛЬ НЕ НАПИСАЛА — ТО НЕ ОТПРАВЛЯЕТСЯ. Пустой ответ, отказ, обрыв связи —
// задача остаётся без текста и не уходит никуда. Заглушка вместо текста хуже молчания:
// молчание видно в очереди, а заглушка уходит живому пациенту от имени клиники.

export type ComposeResult =
  | { ok: true; text: string }
  | { ok: false; error: "no-key" | "no-task" | "refused" | "empty" }

type TaskRow = {
  id: string
  person_id: string
  full_name: string
  phone: string
  goal: string | null
  rule_title: string | null
  visits: number
  last_visit: string | null
  ltv: number
}

/**
 * Собрать сведения о задаче ОДНИМ запросом.
 *
 * 🔒 ИСТОРИЯ ЧЕЛОВЕКА — ЧАСТЬ ПОВОДА, А НЕ УКРАШЕНИЕ. Сообщение «вы давно не были» без
 * числа визитов и даты последнего звучит как рассылка; с ними — как обращение к тому,
 * кого помнят.
 */
async function taskFacts(taskId: string): Promise<TaskRow | null> {
  const row = (await db
    .prepare(
      `SELECT t.id, t.person_id, p.full_name, p.phone,
              s.message_goal AS goal, s.title AS rule_title,
              (SELECT COUNT(*) FROM care_visits v WHERE v.person_id = p.id)              AS visits,
              (SELECT MAX(v.visit_date) FROM care_visits v WHERE v.person_id = p.id)     AS last_visit,
              (SELECT COALESCE(SUM(v.service_cost),0) FROM care_visits v WHERE v.person_id = p.id) AS ltv
         FROM care_tasks t
         JOIN care_people p ON p.id = t.person_id
         LEFT JOIN care_scenarios s ON s.id = t.scenario_id
        WHERE t.id = ?`,
    )
    .get(taskId)) as unknown as TaskRow | undefined
  return row ?? null
}

/**
 * Правила письма — они же ограничители модели.
 *
 * 🔒 ЗАПРЕТЫ ВАЖНЕЕ УКАЗАНИЙ, И ПОТОМУ ОНИ ЗДЕСЬ, А НЕ В ИНСТРУКЦИИ ВЛАДЕЛЬЦА.
 * Инструкцию он пишет про тон и про клинику; а «не выдумывать время приёма» — это не
 * вкус, это граница между сообщением и обещанием, которого никто не давал. Владелец
 * может смягчить тон, но не может разрешить модели выдумать дату — потому что придёт по
 * ней живой человек.
 */
const RULES = [
  "Ты пишешь от имени клиники ОДНО короткое сообщение в мессенджер конкретному человеку.",
  "",
  "Запреты — они важнее всего остального:",
  "— НЕ НАЗЫВАЙ конкретную дату и время приёма. Их не знает никто: расписание в этот текст не передано. Предложи связаться и подобрать время.",
  "— НЕ ОБЕЩАЙ скидок, акций и цен. Их тебе не сообщали.",
  "— НЕ СТАВЬ медицинских утверждений и не советуй лечение.",
  "— НЕ ВЫДУМЫВАЙ фактов о человеке сверх тех, что даны ниже.",
  "",
  "Как писать:",
  "— Обращайся по имени, на «вы».",
  "— Два-четыре предложения. Это мессенджер, а не письмо.",
  "— Без приветственных штампов вроде «надеемся, у вас всё хорошо».",
  "— Верни ТОЛЬКО текст сообщения, без пояснений и без кавычек.",
]

/**
 * Написать текст для задачи и положить его в `generated_message`.
 *
 * 🔒 ИНСТРУКЦИЯ ВЛАДЕЛЬЦА ИДЁТ ПОСЛЕ ЗАПРЕТОВ. Порядок значим: то, что стоит ближе к
 * концу, модель весит выше, и запреты, задвинутые в начало чужим текстом, перестают
 * работать. Здесь наоборот — сначала общие правила, потом голос конкретной клиники.
 */
export async function composeForTask(taskId: string): Promise<ComposeResult> {
  const key = openAiKey()
  if (!key) return { ok: false, error: "no-key" }

  const t = await taskFacts(taskId)
  if (!t) return { ok: false, error: "no-task" }

  const settings = readChannelSettings()
  const clinic = getAppConfig().short_name || getAppConfig().name || ""

  const facts = [
    `Клиника: ${clinic}.`,
    `Имя человека: ${t.full_name}.`,
    `Повод для сообщения: ${t.goal ?? t.rule_title ?? "связаться с человеком"}.`,
    t.visits > 0 ? `Он был у нас ${t.visits} раз.` : "Он ещё ни разу у нас не был.",
    t.last_visit ? `Последний визит: ${t.last_visit}.` : "Даты последнего визита нет.",
  ]

  const system = [
    ...RULES,
    ...(settings.instruction.trim()
      ? ["", "Указания клиники о том, как с людьми разговаривают здесь:", settings.instruction.trim()]
      : []),
  ].join("\n")

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: facts.join("\n") },
        ],
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(45_000),
    })
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
    if (!res.ok) {
      console.error("[compose] модель отказала:", data?.error?.message)
      return { ok: false, error: "refused" }
    }
    const text = data.choices?.[0]?.message?.content?.trim() ?? ""
    if (!text) return { ok: false, error: "empty" }

    await db
      .prepare(`UPDATE care_tasks SET generated_message = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
      .run(text, taskId)

    return { ok: true, text }
  } catch (e) {
    console.error("[compose] модель недоступна:", e)
    return { ok: false, error: "refused" }
  }
}
