import "server-only"
import { db } from "@/lib/db"
import { normalizePhone } from "./phone"
import { fanOut } from "./fan-out"

// ПРИЁМ ВХОДЯЩЕГО СООБЩЕНИЯ от службы каналов (шаг 20-2).
//
// 🔒 ЧТО ИМЕННО ПЕРЕНЕСЕНО ИЗ ИСХОДНИКА, А ЧТО НЕТ. Перенесены: разбор события
// `whatsapp_incoming_msg`, нормализация номера, дедуп по идентификатору сообщения у шлюза,
// запись входящего с пометкой «номер неизвестен». НЕ перенесены: `clinic_id` (закон ⑮ —
// одно приложение, одно учреждение), таблица связей с ключом на клинику и автоматический
// ответ модели без ведома человека.

export type InboundResult =
  | { stored: true; id: string; known: boolean }
  | { stored: false; reason: "not-a-message" | "no-phone" | "duplicate" | "empty-text" }

/** Форма события службы. Описано ровно то, что читаем, — чужой контракт шире. */
type Payload = {
  type?: string
  payload?: {
    new_message?: {
      direction?: string
      sender_phone_number?: string
      message?: { id?: string; type?: string; text?: string }
    }
  }
}

/**
 * Записать входящее. Возвращает, легло ли оно и знаком ли нам номер.
 *
 * 🔒 ОТВЕТА ЗДЕСЬ НЕТ ВООБЩЕ. Функция только ПРИНИМАЕТ. Отвечать ли моделью и уходит ли
 * ответ без человека — решение владельца, ещё не принятое (шаг 20, вопрос ③); пока оно не
 * принято, продукт молча кладёт сообщение в переписку, где его увидит оператор. Это
 * честное состояние: пациент написал, сообщение не потеряно, отвечает человек.
 */
export async function receiveInbound(raw: unknown): Promise<InboundResult> {
  const p = (raw ?? {}) as Payload
  if (p.type !== "whatsapp_incoming_msg") return { stored: false, reason: "not-a-message" }

  const nm = p.payload?.new_message
  if (!nm || nm.direction !== "incoming") return { stored: false, reason: "not-a-message" }
  if (nm.message?.type !== "text" || !nm.message?.text) return { stored: false, reason: "empty-text" }

  const phone = normalizePhone(nm.sender_phone_number)
  if (!phone) return { stored: false, reason: "no-phone" }

  const gatewayId = nm.message.id ?? null

  // 🔒 ДЕДУП ПРОВЕРЯЕТСЯ И ЗДЕСЬ, И УНИКАЛЬНЫМ ИНДЕКСОМ (он стоит с шага 10). Служба
  // повторяет доставку, если мы не ответили вовремя; без проверки один вопрос пациента
  // лёг бы в переписку дважды, а оператор ответил бы на него два раза.
  if (gatewayId) {
    const dup = await db
      .prepare(`SELECT id FROM care_messages WHERE chatpush_message_id = ?`)
      .get(gatewayId)
    if (dup) return { stored: false, reason: "duplicate" }
  }

  const person = (await db
    .prepare(`SELECT id FROM care_people WHERE phone = ?`)
    .get(phone)) as { id?: string } | undefined

  const id = `in-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const text = nm.message.text

  await db
    .prepare(
      // 🔒 НЕИЗВЕСТНЫЙ НОМЕР ТОЖЕ ЗАПИСЫВАЕТСЯ, и это перенесено из исходника осознанно:
      // человек, которого нет в CRM, — не спам, а живое обращение. Экран переписки его
      // показывает и помечает; выбросить значило бы потерять клиента, который написал сам.
      `INSERT INTO care_messages
         (id, person_id, phone, direction, text, channel, chatpush_message_id, ai_generated, status, parts)
       VALUES (?,?,?,'incoming',?, 'whatsapp', ?, 0, ?, ?)`,
    )
    .run(
      id,
      person?.id ?? null,
      phone,
      text,
      gatewayId,
      person ? "received" : "skipped_unknown",
      JSON.stringify([{ type: "text", text }]),
    )

  // 🔒 ВЕЕР ПОСЛЕ ЗАПИСИ И НЕ ЛОМАЕТ ПРИЁМ. Сообщение уже в базе; склады — дополнение к
  // нему, а не условие. Отказ склада не должен превращаться в отказ двери: служба тогда
  // повторит доставку, и мы будем разбирать одно сообщение вечно.
  await fanOut({ id, phone, person_id: person?.id ?? null, direction: "incoming", text, created_at: new Date().toISOString().replace(/.d{3}Z$/, "Z") })

  return { stored: true, id, known: Boolean(person?.id) }
}

// ─── Поздний статус доставки ─────────────────────────────────────────────────
//
// 🔒 ✗ ЭТО СОБЫТИЕ ПРИХОДИЛО К НАМ С САМОГО НАЧАЛА И МОЛЧА ВЫБРАСЫВАЛОСЬ. Вебхук
// подписан на `whatsapp_status_msg` (так его завёл ещё Филипп), но обработчик знал
// только входящие сообщения. Из-за этого в базе стояло `sent` на сообщении, которое
// служба не смогла доставить, — и узнал об этом владелец, а не продукт.
//
// 🔒 СОСТОЯНИЕ ЖИВЁТ У ЧУЖОЙ СЛУЖБЫ, и единственный способ его узнать — дождаться её
// события. Ответ на наш запрос отправки означает «принято», и не более.

type StatusPayload = {
  type?: string
  payload?: {
    delivery_id?: number | string
    status?: { status_id?: number; description?: string }
    // Разные события службы называют это поле по-разному; берём оба.
    message?: { id?: string }
  }
}

/** Итог доставки словами службы. `null` — событие не про статус. */
export async function receiveStatus(raw: unknown): Promise<{ updated: boolean; detail?: string }> {
  const p = (raw ?? {}) as StatusPayload
  if (p.type !== "whatsapp_status_msg") return { updated: false }

  const deliveryId = p.payload?.delivery_id != null ? String(p.payload.delivery_id) : null
  const description = p.payload?.status?.description ?? null
  if (!deliveryId) return { updated: false }

  // 🔒 СОПОСТАВЛЕНИЕ ПО ИДЕНТИФИКАТОРУ ДОСТАВКИ, А НЕ ПО ТЕЛЕФОНУ. У одного номера бывает
  // десяток сообщений; по телефону мы пометили бы не то.
  const row = (await db
    .prepare(`SELECT id FROM care_messages WHERE gateway_delivery_id = ?`)
    .get(deliveryId)) as { id?: string } | undefined
  if (!row?.id) return { updated: false }

  // 🔒 СПИСОК УСПЕШНЫХ СОСТОЯНИЙ НАЗВАН ЯВНО, А НЕ ВЫВЕДЕН ОТ ПРОТИВНОГО. Служба знает
  // больше семидесяти состояний, и «всё, что не отказ, — успех» однажды объявит
  // доставленным сообщение, которое ещё в очереди.
  const okWords = ["Доставлено", "Прочитано", "Передано оператору"]
  const delivered = description ? okWords.some(w => description.startsWith(w)) : false

  await db
    .prepare(`UPDATE care_messages SET delivery = ?, delivery_detail = ? WHERE id = ?`)
    .run(delivered ? "sent" : "failed", description, row.id)

  return { updated: true, detail: description ?? undefined }
}
