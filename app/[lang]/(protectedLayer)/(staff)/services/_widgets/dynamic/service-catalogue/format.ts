// Как ЭТОТ каталог показывает деньги и даты. Свой файл: изоляция виджета.

export function money(v: number | null | undefined): string {
  return (Math.round(Number(v) || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")
}

export function humanDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null
}
