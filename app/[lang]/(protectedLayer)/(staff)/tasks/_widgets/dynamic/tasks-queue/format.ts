// Как ЭТА очередь показывает даты и телефон. Свой файл: изоляция виджета.

/** ISO → человеческая запись. */
export function humanDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null
}

/** Сегодняшняя дата в том же виде, в каком она лежит в базе. */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Читаемая запись российского номера. */
export function phone(e164: string | null | undefined): string {
  if (!e164) return ""
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164)
  return m ? `+7 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : e164
}
