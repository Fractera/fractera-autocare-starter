import "server-only"
import { db } from "@/lib/db"
import { sendText, chatpushConfigured, type Channel } from "./chatpush"
import { fanOut } from "./fan-out"

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
  /** Адрес картинки в медиахранилище; `null` — вложения нет. */
  attachment_url: string | null
  attachment_mime: string | null
  attachment_name: string | null
  /** Дошло ли наружу: `null` — неизвестно (строка старше колонки), `pending` — канала нет. */
  delivery: string | null
  /** Каким каналом ушло — служба возвращает это в ответе на отправку. */
  channel_used: string | null
  /** Причина словами службы, а не кодом. */
  delivery_detail: string | null
  /** Кто отправил: manager | ai | timer. Пусто — строка старше колонки. */
  origin: string | null
  /**
   * Части сообщения по стандарту AI SDK (`UIMessagePart[]`) — решение владельца 2026-08-25.
   *
   * 🔒 ЭТО ГЛАВНОЕ ПОЛЕ СОДЕРЖАНИЯ, а `text` и `attachment_*` — прошлое и подпорка. Читая
   * сообщение, брать части: в них и текст, и файлы, и их порядок. У строк, написанных до
   * колонки, здесь `null`, и части для них СОБИРАЮТСЯ на лету из старых полей — мост для
   * существующих данных, а не второй стандарт.
   */
  parts: MessagePart[] | null
}

/**
 * Часть сообщения. Форма взята из `ai@6` (`node_modules/ai/dist/index.d.ts`), а не выдумана:
 * `TextUIPart = { type:'text', text }`, `FileUIPart = { type:'file', mediaType, filename?, url }`.
 * Описываем ровно те две, которыми пользуемся; остальные части стандарта (рассуждение,
 * вызов инструмента) появятся здесь в тот день, когда появятся в продукте.
 */
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "file"; mediaType: string; filename?: string; url: string }

/**
 * Части сообщения для показа: свои, если они есть, иначе собранные из старых полей.
 *
 * 🔒 МОСТ ЖИВЁТ В ОДНОМ МЕСТЕ. Разложи его по экранам — и каждый следующий будет читать
 * старые строки на свой лад; здесь же он виден целиком и умрёт одной правкой в тот день,
 * когда старых строк не останется.
 */
export function partsOf(m: Pick<CareMessage, "parts" | "text" | "attachment_url" | "attachment_mime" | "attachment_name">): MessagePart[] {
  if (m.parts && m.parts.length) return m.parts
  const out: MessagePart[] = []
  if (m.text) out.push({ type: "text", text: m.text })
  if (m.attachment_url) {
    out.push({
      type: "file",
      url: m.attachment_url,
      mediaType: m.attachment_mime ?? "application/octet-stream",
      filename: m.attachment_name ?? undefined,
    })
  }
  return out
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
// 🔒 ВТОРОЙ КЛЮЧ СОРТИРОВКИ — `rowid`, А НЕ `id` (Рома нашёл на живом экране 2026-08-25).
// ✗ Здесь стояло `ORDER BY created_at, id`, и оно врало ровно тогда, когда врать
// нельзя: время пишется с точностью до СЕКУНДЫ, ответ приходит в ту же секунду, что и
// вопрос, — и тай-брейкером становился `id`. А `id` порядка не знает: `demo-reply-…`
// лексикографически меньше `out-…`, поэтому ОТВЕТ ВСТАВАЛ НАД ВОПРОСОМ. Разговор,
// прочитанный задом наперёд, — это не косметика, это неверный разговор.
//
// `rowid` — порядок ВСТАВКИ, то есть ровно то, что нужно: кто записан раньше, тот и
// сказал раньше. Точность времени при этом не трогаем: она общая с CRM и с вебхуком,
// и «починить» её здесь значило бы разойтись с ними.
export async function threadOf(phone: string): Promise<CareMessage[]> {
  const rows = await db
    .prepare(
      `SELECT id, phone, person_id, direction, text, channel, ai_generated, status, created_at,
              attachment_url, attachment_mime, attachment_name, delivery, parts,
              channel_used, delivery_detail, origin
         FROM care_messages WHERE phone = ? ORDER BY created_at, rowid`,
    )
    .all(phone)
  // 🔒 РАЗБОР JSON ЖИВЁТ ЗДЕСЬ, А НЕ НА ЭКРАНЕ. В колонке лежит текст, и отдать его
  // наружу строкой значило бы, что каждый следующий потребитель разбирает её сам — своим
  // способом и со своей обработкой порченой записи.
  return (rows as unknown as (Omit<CareMessage, "parts"> & { parts: string | null })[]).map((r) => ({
    ...r,
    parts: parseParts(r.parts),
  }))
}

/** Порченый JSON — не повод уронить ветку: сообщение покажется по старым полям. */
function parseParts(raw: string | null): MessagePart[] | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? (v as MessagePart[]) : null
  } catch {
    return null
  }
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

// ─── Отправка ────────────────────────────────────────────────────────────────

/**
 * Файл, приложенный оператором. 🔒 ФОРМА — `FileUIPart` СТАНДАРТА AI SDK, а не своя
 * (решение владельца 2026-08-25). Ровно эту форму отдаёт поле ввода библиотеки, ровно
 * такой она ложится в `parts` и ровно такой читается обратно: ни одного перевода со
 * стандарта на самоделку и назад.
 */
export type OutgoingFile = { url: string; mediaType: string; filename?: string }

/**
 * Записать исходящее сообщение оператора.
 *
 * 🔒 «ЗАПИСАТЬ», А НЕ «ОТПРАВИТЬ», И РАЗНИЦА НЕ В СЛОВЕ. Канала наружу у продукта нет:
 * ChatPush — это шаг 20, который не начат. Поэтому сообщение ложится в базу с
 * `delivery = 'pending'`, и экран обязан сказать об этом человеку. Молчаливая запись в
 * базу под кнопкой «Отправить» — обещание, которого продукт не сдержит, и обнаружит это
 * не разработчик, а пациент, не получивший ответа.
 *
 * 🔒 КАРТИНКА ПРИХОДИТ УЖЕ АДРЕСОМ. Файл уходит в медиахранилище на стороне браузера
 * (`services/upload`), сюда попадает ссылка: у медиа один владелец, и второй способ
 * класть файлы означал бы два места, где картинки живут по разным правилам.
 */
export async function sendMessage(
  phone: string,
  text: string,
  files: OutgoingFile[] = [],
  channel: Channel = "auto",
  origin: "manager" | "ai" | "timer" = "manager",
): Promise<CareMessage> {
  const clean = text.trim()
  if (!clean && files.length === 0) throw new Error("empty")

  // 🔒 ЧАСТИ СОБИРАЮТСЯ В ПОРЯДКЕ РАЗГОВОРА: сперва сказанное, потом приложенное. Порядок
  // — часть содержания, и стандарт хранит его именно ради этого.
  const parts: MessagePart[] = []
  if (clean) parts.push({ type: "text", text: clean })
  for (const f of files) {
    parts.push({ type: "file", url: f.url, mediaType: f.mediaType, filename: f.filename })
  }

  // Личность строки — время плюс случайная часть: две отправки в одну секунду законны.
  const id = `out-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const person = (await db
    .prepare(`SELECT id FROM care_people WHERE phone = ?`)
    .get(phone)) as { id?: string } | undefined

  await db
    .prepare(
      // 🔒 `text` ЗАПОЛНЯЕТСЯ И ДАЛЬШЕ, хотя главное содержание теперь в `parts`. Список
      // веток показывает превью последнего сообщения одним запросом, и разбирать JSON в
      // SQL ради этой строки — цена, которую платить незачем. Это не второй источник
      // правды: `text` — производная от текстовой части, и пишутся они вместе.
      `INSERT INTO care_messages
         (id, person_id, phone, direction, text, channel, ai_generated, status, delivery, parts, origin)
       VALUES (?,?,?,'outgoing',?,?,?,'received','pending',?,?)`,
    )
    .run(
      id,
      person?.id ?? null,
      phone,
      clean || null,
      // Ветка демонстрации остаётся демонстрацией: ответ оператора в ней не должен
      // выглядеть живой перепиской, иначе пометка на экране перестанет быть правдой.
      await channelOf(phone),
      // Автор модели помечается и старой колонкой: её читают уже написанные экраны, и
      // расходиться двум признакам об одном факте нельзя.
      origin === "ai" ? 1 : 0,
      JSON.stringify(parts),
      origin,
    )

  const row = (await db
    .prepare(
      `SELECT id, phone, person_id, direction, text, channel, ai_generated, status, created_at,
              attachment_url, attachment_mime, attachment_name, delivery, parts
         FROM care_messages WHERE id = ?`,
    )
    .get(id)) as unknown as Omit<CareMessage, "parts"> & { parts: string | null }
  const saved = { ...row, parts: parseParts(row.parts) }

  // Веер по складам: исходящее оператора — такая же часть разговора, как входящее.
  // Записывать только вопросы пациента значило бы хранить половину диалога.
  await fanOut({ id, phone, person_id: person?.id ?? null, direction: "outgoing", text: clean, created_at: saved.created_at })

  // 🔒 ОТПРАВКА ИДЁТ ПОСЛЕ ЗАПИСИ, И ПОРЯДОК ЗДЕСЬ ЗНАЧИМ. Сначала строка в базе, потом
  // попытка наружу: упади канал между ними — сообщение всё равно в переписке, оператор
  // видит его и его состояние. Обратный порядок терял бы отправленное при любом сбое
  // записи, и никто бы не узнал, что пациенту это уже сказали.
  //
  // 🔒 ДЕМОНСТРАЦИОННАЯ ВЕТКА НАРУЖУ НЕ УХОДИТ НИКОГДА. Она придумана скриптом ради вида
  // экрана; отправить из неё значило бы написать живому человеку по выдуманному поводу.
  if (saved.channel === "demo") return saved

  if (!chatpushConfigured()) return saved

  // 🔒 ВЛОЖЕНИЕ БЕЗ ТЕКСТА НАРУЖУ НЕ УХОДИТ, И ЭТО НАЗВАНО, А НЕ СПРЯТАНО. Дверь ChatPush
  // принимает `{ text, phone }` — картинок она не берёт вовсе. Отправить одну подпись
  // значило бы, что пациент получил сообщение, а приложенного к нему не увидел; отправить
  // ссылку на медиахранилище — что он получил закрытый адрес, требующий входа. Пока канал
  // не умеет файлы, такое сообщение остаётся `pending`, и оператор это видит.
  if (!clean) return saved

  const sent = await sendText(phone, clean, channel)

  // 🔒 ТРИ СОСТОЯНИЯ ВМЕСТО ДВУХ, И ЭТО ГЛАВНАЯ ПРАВКА ШАГА 35.
  // ✗ Здесь стояло `sent.ok ? "sent" : …` — то есть ответ двери принимался за
  // ДОСТАВКУ. Рома нашёл это на живом сообщении: у нас стояло `sent`, а служба ответила
  // «Пользователь не найден в Telegram». Принять запрос и доставить сообщение — разные
  // события, и второе приходит ПОЗЖЕ, отдельным статусом службы.
  const delivery = sent.ok ? "accepted" : sent.error === "not-configured" ? "pending" : "failed"
  // Канал, который служба ВЫБРАЛА (а не который мы просили): при `auto` она решает сама,
  // и знать её решение — единственный способ показать маршрут на экране.
  const used = sent.ok ? (sent.routing ?? []).join(",") || null : null
  await db
    .prepare(`UPDATE care_messages SET delivery = ?, channel_used = ?, gateway_delivery_id = ?, delivery_detail = ? WHERE id = ?`)
    .run(delivery, used, sent.ok ? (sent.id ?? null) : null, sent.ok ? null : (sent.detail ?? sent.error), id)

  // 🔒 СОСТОЯНИЕ ВОЗВРАЩАЕТСЯ ТО, ЧТО ЛЕГЛО, а не то, что мы собирались положить.
  return { ...saved, delivery }
}

/** Канал ветки: продолжаем тот, в котором она началась; новая ветка — `whatsapp`. */
async function channelOf(phone: string): Promise<string> {
  const row = (await db
    .prepare(`SELECT channel FROM care_messages WHERE phone = ? ORDER BY created_at DESC LIMIT 1`)
    .get(phone)) as { channel?: string } | undefined
  return row?.channel ?? "whatsapp"
}
