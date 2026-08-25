import "server-only"
import { db } from "@/lib/db"

// ПЕРЕПИСКА С ЛЮДЬМИ.
//
// 🔒 ВЕТКА ПРИВЯЗАНА К ТЕЛЕФОНУ, А НЕ К ЧЕЛОВЕКУ (закон схемы шага 10,
// перенесённый из исходника). Входящее записывается раньше, чем номер сопоставлен
// с карточкой, и разговоры с незнакомых номеров тоже надо видеть: это живые
// обращения, которые кто-то должен разобрать руками.
//
// ✗ Соблазн ключевать по `person_id` теряет ровно те ветки, ради которых экран и
// нужен: неизвестный номер остался бы невидимым, и никто бы не узнал, что человек
// писал.

export type MessageThread = {
  phone: string
  total: number
  incoming: number
  last_at: string
  last_text: string | null
  last_direction: "incoming" | "outgoing"
  channel: string
  /** Пусто — номер не сопоставлен ни с одной карточкой. Законное состояние. */
  person_id: string | null
  full_name: string | null
  consent_to_contact: number | null
}

export type CareMessage = {
  id: string
  phone: string
  person_id: string | null
  direction: "incoming" | "outgoing"
  text: string | null
  channel: string
  ai_generated: number
  status: string
  created_at: string
}

/**
 * Ветки переписки, свежие сверху.
 *
 * 🔒 ОДИН ЗАПРОС, А НЕ ТРИ СКЛЕЙКИ В ПАМЯТИ. ✗ В исходнике это три отдельные
 * выборки, склеенные по телефону в JavaScript, — и причина названа прямо в его
 * коде: «Postgres строг к GROUP BY». У нас слой данных на SQLite, коррелированный
 * подзапрос законен, и три обращения по сети вместо одного были бы платой за
 * чужое ограничение.
 */
export async function messageThreads(limit = 200): Promise<MessageThread[]> {
  const rows = await db
    .prepare(
      `SELECT m.phone,
              COUNT(*)                                                    AS total,
              SUM(CASE WHEN m.direction = 'incoming' THEN 1 ELSE 0 END)   AS incoming,
              MAX(m.created_at)                                           AS last_at,
              (SELECT text      FROM care_messages x WHERE x.phone = m.phone ORDER BY x.created_at DESC LIMIT 1) AS last_text,
              (SELECT direction FROM care_messages x WHERE x.phone = m.phone ORDER BY x.created_at DESC LIMIT 1) AS last_direction,
              (SELECT channel   FROM care_messages x WHERE x.phone = m.phone ORDER BY x.created_at DESC LIMIT 1) AS channel,
              p.id AS person_id, p.full_name, p.consent_to_contact
         FROM care_messages m
         LEFT JOIN care_people p ON p.phone = m.phone
        GROUP BY m.phone
        ORDER BY MAX(m.created_at) DESC
        LIMIT ?`,
    )
    .all(limit)
  return rows as unknown as MessageThread[]
}

/** Одна ветка целиком, по порядку разговора. */
export async function threadOf(phone: string): Promise<CareMessage[]> {
  const rows = await db
    .prepare(
      `SELECT id, phone, person_id, direction, text, channel, ai_generated, status, created_at
         FROM care_messages WHERE phone = ? ORDER BY created_at, id`,
    )
    .all(phone)
  return rows as unknown as CareMessage[]
}

/** Сводка: сколько веток, сколько без карточки, сколько отвечено моделью. */
export async function messagesSummary(): Promise<{
  threads: number
  messages: number
  unknownNumbers: number
  aiReplies: number
}> {
  const row = (await db
    .prepare(
      `SELECT (SELECT COUNT(DISTINCT phone) FROM care_messages)                       AS threads,
              (SELECT COUNT(*) FROM care_messages)                                    AS messages,
              (SELECT COUNT(DISTINCT m.phone) FROM care_messages m
                 LEFT JOIN care_people p ON p.phone = m.phone
                WHERE p.id IS NULL)                                                   AS unknownNumbers,
              (SELECT COUNT(*) FROM care_messages WHERE ai_generated = 1)             AS aiReplies`,
    )
    .get()) as Record<string, number> | undefined
  const n = (k: string) => Number(row?.[k] ?? 0)
  return { threads: n("threads"), messages: n("messages"), unknownNumbers: n("unknownNumbers"), aiReplies: n("aiReplies") }
}
