import "server-only"
import { db } from "@/lib/db"
import { remember } from "@/lib/fractera/vectors"
import { learn } from "@/lib/fractera/knowledge"
import { readChannelSettings } from "@/lib/company/channel-settings"

// ВЕЕР ПО СКЛАДАМ: одно сообщение переписки расходится по хранилищам (шаг 34).
//
// Паттерн взят у `lib/products/telegram-desk/ingest.ts` (строки 355–400) — тот же род
// задачи, те же двери, те же пять решений. Читан целиком, а не пересказан.
//
// 🔒 ГЛАВНЫЙ ЗАКОН: КАЖДЫЙ СКЛАД — ОТДЕЛЬНАЯ ПОПЫТКА. Векторный склад лежит, граф ещё
// строится, ключа нет — это не повод потерять остальное. Отказ становится СТРОКОЙ в
// заметках, а не исключением: дверь обязана ответить службе каналов, иначе та повторит
// доставку, и одно сообщение будут разбирать вечно.
//
// 🔒 ОТЛИЧИЕ ОТ ОБРАЗЦА: ВЕЕР ПОДЧИНЯЕТСЯ ЧЕКБОКСАМ ВЛАДЕЛЬЦА. У Telegram Desk он
// безусловен; у нас на `/ru/channels` шесть переключателей, и они обязаны что-то значить —
// иначе повторится шаг 522, где выключатель ничего не выключал.

/** Пространство имён продукта в общем графе сервера. */
export const RAG_NAMESPACE = "care"
/** Коллекция векторов продукта. */
export const VECTOR_COLLECTION = "care"

/**
 * Имя документа в графе.
 *
 * 🔒 НЕСЁТ ИДЕНТИФИКАТОР ЧЕЛОВЕКА, И ЭТО НЕ УКРАШЕНИЕ. Стандарт владельца (2026-08-25)
 * велит класть в конверт имя и телефон; закон проекта (`use-personal-data`, случай 6)
 * предупреждает, что «имя, скопированное в каждую строку и в векторный склад, превращает
 * стирание в охоту». Приставка с идентификатором мирит эти два: стандарт исполняется
 * полностью, а «забудьте меня» становится ОДНОЙ операцией по приставке вместо обхода
 * всего графа.
 *
 * Человек без карточки — законное состояние (незнакомый номер), тогда приставка `unknown`.
 */
export function ragSource(personId: string | null, messageId: string): string {
  return `${RAG_NAMESPACE}/person-${personId ?? "unknown"}/msg-${messageId}`
}

type Person = { id: string | null; full_name: string | null; phone: string }

/**
 * Вводный текст документа — СТАНДАРТ ВЛАДЕЛЬЦА, дословно (Рома, 2026-08-25):
 * «всегда был вводный текст, который бы содержал: сообщение от пользователя, идентификатор,
 * имя, телефон, дата время минуты секунды, текст сообщения».
 *
 * 🔒 ВРЕМЯ С СЕКУНДАМИ, А НЕ ДО МИНУТ. Владелец назвал секунды прямо, и это не педантизм:
 * два сообщения одной минуты — обычное дело в разговоре, а граф должен уметь их различить.
 */
function envelope(person: Person, messageId: string, direction: string, text: string, at: string): string {
  const when = at.replace("T", " ").replace("Z", " UTC")
  const who = direction === "incoming" ? "пациента" : "оператора клиники"
  const lines = [
    `Источник: ${RAG_NAMESPACE}. Сообщение от ${who}.`,
    `Идентификатор человека: ${person.id ?? "не сопоставлен с карточкой"}.`,
    `Имя: ${person.full_name ?? "неизвестно"}.`,
    `Телефон: ${person.phone}.`,
    `Идентификатор сообщения: ${messageId}.`,
    `Дата и время: ${when}.`,
    `Текст сообщения: ${text}`,
  ]
  // Перевод строки кодом, а не escape-последовательностью: этот приём взят у образца, и
  // причина там названа — файл проезжает через цепочку оболочек, и каждая съедает
  // обратный слэш по-своему.
  return lines.join(String.fromCharCode(10))
}

/**
 * Разослать сообщение по складам. Не бросает НИКОГДА: вызывающий — дверь, отвечающая
 * службе каналов.
 */
export async function fanOut(
  message: { id: string; phone: string; person_id: string | null; direction: string; text: string | null; created_at: string },
): Promise<void> {
  const text = (message.text ?? "").trim()
  if (!text) return

  const settings = readChannelSettings()
  const notes: string[] = []
  const artifacts: { kind: string; ref: string }[] = []

  const person = (await db
    .prepare(`SELECT id, full_name, phone FROM care_people WHERE phone = ?`)
    .get(message.phone)) as Person | undefined
  const who: Person = person ?? { id: message.person_id, full_name: null, phone: message.phone }

  // ── Векторный склад ────────────────────────────────────────────────────────
  //
  // 🔒 «ВЫКЛЮЧЕНО» И «ОТКАЗАЛО» — РАЗНЫЕ ЗАПИСИ. Первое решение владельца, второе беда
  // службы. Слить их значило бы, что администратор ищет поломку там, где сам выключил.
  if (!settings.sources.vector) {
    notes.push("vector:off")
  } else {
    try {
      const v = await remember({
        collection: VECTOR_COLLECTION,
        text,
        refTable: "care_messages",
        refId: message.id,
      })
      artifacts.push({ kind: "vector", ref: v.id })
    } catch {
      notes.push("vector:failed")
    }
  }

  // ── Граф знаний ────────────────────────────────────────────────────────────
  if (!settings.sources.rag) {
    notes.push("rag:off")
  } else {
    const source = ragSource(who.id, message.id)
    const letter = envelope(who, message.id, message.direction, text, message.created_at)
    const r = await learn(letter, source)
    // 🔒 ССЫЛКА — ИМЯ ИСТОЧНИКА, А НЕ ID ДОКУМЕНТА: движок строит его в фоне и выдаёт свой
    // идентификатор позже. Имя мы задали сами и находим по нему в любой момент.
    if (r.accepted) artifacts.push({ kind: "rag", ref: source })
    else notes.push("rag:refused")
  }

  for (const a of artifacts) {
    await db
      .prepare(`INSERT OR IGNORE INTO care_artifacts (message_id, kind, ref) VALUES (?,?,?)`)
      .run(message.id, a.kind, a.ref)
  }

  // 🔒 ЗАМЕТКИ ЛОЖАТСЯ В СТРОКУ СООБЩЕНИЯ. Иначе отказ виден ровно один раз — в ответе,
  // который служба каналов прочитает и выбросит.
  if (notes.length) {
    await db
      .prepare(`UPDATE care_messages SET notes = ? WHERE id = ?`)
      .run(notes.join(", "), message.id)
  }
}
