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
