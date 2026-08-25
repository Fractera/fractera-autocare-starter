"use client"

// История визитов: строка = одна услуга одного приёма.

import { EmptyState } from "@/components/ui/empty-state"
import { humanDate, money } from "./format"
import type { Visit } from "./use-person"
import type { PersonCardUi } from "./ui.i18n"

/**
 * Явка словом, а не значком.
 *
 * 🔒 ТРИ СОСТОЯНИЯ, А НЕ ДВА. `attendance` бывает пустым: запись есть, а
 * отметки нет. Склеить «не пришёл» и «неизвестно» значило бы обвинить человека
 * в прогуле, которого никто не фиксировал, — а на этом стоят сегменты.
 */
function attendanceWord(a: number | null, ui: PersonCardUi): { text: string; tone: string } {
  if (a === 1) return { text: ui.came, tone: "text-foreground" }
  if (a === null || a === undefined) return { text: ui.unknown, tone: "text-muted-foreground" }
  return { text: ui.missed, tone: "text-muted-foreground" }
}

export function PersonVisits({ visits, ui }: { visits: Visit[]; ui: PersonCardUi }) {
  if (visits.length === 0) return <EmptyState title={ui.emptyHistory} />

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[40rem] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="w-28 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colDate}</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colService}</th>
            <th className="w-40 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colDoctor}</th>
            <th className="w-28 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colCost}</th>
            <th className="w-28 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colCame}</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((v, i) => {
            const came = attendanceWord(v.attendance, ui)
            // Услуга приходит пустой строкой — так синхронизация пишет приём без
            // названия (шаг 11). Пустая ячейка читалась бы как потеря данных.
            const service = (v.service_title ?? "").trim()
            return (
              <tr key={v.id} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                <td className="px-4 py-2.5 tabular-nums">{humanDate(v.visit_date)}</td>
                <td className="px-4 py-2.5">
                  {service || <span className="text-muted-foreground">{ui.noService}</span>}
                </td>
                <td className="px-4 py-2.5">
                  {v.staff_name || <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {typeof v.service_cost === "number" ? money(v.service_cost) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className={`px-4 py-2.5 ${came.tone}`}>{came.text}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
