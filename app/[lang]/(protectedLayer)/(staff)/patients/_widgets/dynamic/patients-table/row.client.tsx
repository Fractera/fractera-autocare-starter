"use client"

// Строка списка людей.
//
// 🔒 ИМЯ — ССЫЛКА НА КАРТОЧКУ, И ЭТО ЕДИНСТВЕННОЕ ДЕЙСТВИЕ СТРОКИ. Список
// отвечает на вопрос «кто есть и в каком состоянии»; всё остальное про человека
// живёт на его карточке, и второе действие в строке только уводило бы от него.
//
// 🔒 ЧЕГО В СТРОКЕ НЕТ И ПОЧЕМУ. Внутренней заметки: свободный текст, в котором
// легко окажется то, чему не место в общем списке. Дверь его и не отдаёт.

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { visitDate, money, phone } from "./format"
import type { PersonRow } from "./use-list"
import type { PatientsTableUi } from "./ui.i18n"

export function PatientsRow(
  { row, ui, lang, striped }: {
    row: PersonRow
    ui: PatientsTableUi
    lang: string
    striped: boolean
  },
) {
  const last = visitDate(row.last_visit)
  const ahead = visitDate(row.next_visit_date)

  return (
    <tr className={`border-b border-border last:border-0 ${striped ? "bg-muted/20" : ""}`}>
      <td className="px-4 py-2.5">
        <Link
          href={`/${lang}/patients/${row.id}`}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {row.full_name}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="tabular-nums text-muted-foreground">{phone(row.phone)}</span>
          {/* 🔒 ЗАПРЕТ НА СВЯЗЬ ВИДЕН В СПИСКЕ, А НЕ ТОЛЬКО В КАРТОЧКЕ. Этот
              продукт существует, чтобы писать людям; человек, снявший согласие,
              обязан быть отличим до того, как его выберут в рассылку. */}
          {!row.consent_to_contact && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
              {ui.noConsent}
            </Badge>
          )}
          {!!row.has_open_task && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
              {ui.openTask}
            </Badge>
          )}
        </div>
      </td>

      <td className="px-4 py-2.5 text-right tabular-nums">{row.visits}</td>

      {/* «Не был» — не то же самое, что пустая ячейка: пустая читается как сбой
          выгрузки, а это законное состояние человека. */}
      <td className="px-4 py-2.5 tabular-nums">
        {last ?? <span className="text-muted-foreground">{ui.never}</span>}
      </td>

      <td className="px-4 py-2.5 tabular-nums">
        {ahead ?? <span className="text-muted-foreground">{ui.noAhead}</span>}
      </td>

      <td className="px-4 py-2.5 text-right tabular-nums">{money(row.ltv)}</td>
    </tr>
  )
}
