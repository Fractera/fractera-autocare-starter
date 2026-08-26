import type { MessagePart } from "./use-threads"
// Как ЭТА переписка показывает время и телефон. Свой файл: изоляция виджета.

/** Момент разговора: дата и время, без секунд. */
export function when(iso: string | null | undefined): string {
  if (!iso) return ""
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]}` : iso
}

export function phone(e164: string | null | undefined): string {
  if (!e164) return ""
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164)
  return m ? `+7 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : e164
}

// 🔒 МОСТ К СТАРЫМ СТРОКАМ ЖИВЁТ РЯДОМ С ПОКАЗОМ, А НЕ ВНУТРИ НЕГО. Сообщения, написанные
// до появления колонки `parts`, несут текст и одно вложение плоскими полями. Собрать из
// них части — работа на один экран и на один день: когда таких строк не останется, эта
// функция удалится целиком, не задев ничего вокруг.
//
// Серверный близнец лежит в `lib/care/messages.ts` (`partsOf`) — там он нужен тому, кто
// читает базу напрямую. Две копии одного моста лучше общей библиотеки: мост временный, и
// умереть они должны вместе с ним, а не пережить его в общем модуле.
export function partsOf(m: {
  parts: MessagePart[] | null
  text: string | null
  attachment_url: string | null
  attachment_mime: string | null
  attachment_name: string | null
}): MessagePart[] {
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
