"use client"

// Строка списка людей.
//
// 🔒 У СТРОКИ ОДНО ДЕЙСТВИЕ — ОТКРЫТЬ КАРТОЧКУ, И ДВЕ ТОЧКИ ВХОДА В НЕГО (2026-08-25).
// Список отвечает на вопрос «кто есть и в каком состоянии»; всё остальное про человека
// живёт на его карточке, и ВТОРОЕ ДЕЙСТВИЕ в строке только уводило бы от него. Вторая
// ССЫЛКА на то же место второго действия не создаёт — она чинит то, что единственный
// вход был невидим.
//
// 🔒 ЧЕГО В СТРОКЕ НЕТ И ПОЧЕМУ. Внутренней заметки: свободный текст, в котором
// легко окажется то, чему не место в общем списке. Дверь его и не отдаёт.

import Link from "next/link"
import { ChevronRight } from "lucide-react"
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
        {/* 🔒 ССЫЛКА ВЫГЛЯДИТ ССЫЛКОЙ (Рома, 2026-08-25). Здесь стояло
            `text-foreground` с подчёркиванием ТОЛЬКО при наведении: имя было
            неотличимо от обычного текста, и владелец, у которого карточка была
            построена ещё в шаге 12-3, не нашёл на неё ни одного входа. Дорога,
            которую видно лишь тому, кто уже знает о ней, — это отсутствующая
            дорога. На ощупь пальцем наведения нет вовсе. */}
        <Link
          href={`/${lang}/patients/${row.id}`}
          className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
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

      {/* Вторая точка входа в ту же карточку — не второе действие строки. Имя
          ссылкой отвечает тому, кто читает список глазами; явная кнопка справа —
          тому, кто ищет глазами, «куда тут нажимать». Подпись видна на широком
          экране и остаётся голосу экранного диктора на узком. */}
      <td className="px-4 py-2.5 text-right">
        <Link
          href={`/${lang}/patients/${row.id}`}
          aria-label={`${ui.openCard}: ${row.full_name}`}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <span className="hidden lg:inline">{ui.openCard}</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </td>
    </tr>
  )
}
