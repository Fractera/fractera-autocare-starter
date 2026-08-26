"use client"

// Строка очереди: кому, по какому поводу, к какому сроку и в каком состоянии.

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { humanDate, today, phone } from "./format"
import { statusWord, type TasksQueueUi } from "./ui.i18n"
import type { TaskRow } from "./use-queue"

export function QueueRow(
  { row, ui, lang, striped, selected, onSelect }: { row: TaskRow; ui: TasksQueueUi; lang: string; striped: boolean; selected: boolean; onSelect: (id: string, on: boolean) => void },
) {
  const due = humanDate(row.due_date)
  const t = today()
  const isOverdue = row.due_date < t
  const isToday = row.due_date === t

  return (
    <tr className={`border-b border-border last:border-0 ${striped ? "bg-muted/20" : ""}`}>
      <td className="px-4 py-2.5">
        <Link
          href={`/${lang}/patients/${row.person_id}`}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {row.full_name}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="tabular-nums text-muted-foreground">{phone(row.phone)}</span>
          {/* 🔒 ЗАПРЕТ НА СВЯЗЬ ВИДЕН И ЗДЕСЬ. Предохранитель не даёт завести
              задачу человеку без согласия, но согласие могли снять ПОСЛЕ того,
              как задача создана. Тогда её нельзя выполнять — и сотрудник обязан
              увидеть это до того, как возьмёт трубку. */}
          {!row.consent_to_contact && (
            <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-normal">
              {ui.noConsent}
            </Badge>
          )}
        </div>
      </td>

      {/* Повод: название сценария или честное «заведено вручную». Пустая ячейка
          читалась бы как потерянная связь со сценарием. */}
      <td className="px-4 py-2.5">
        {row.scenario_title ?? <span className="text-muted-foreground">{ui.noScenario}</span>}
      </td>

      <td className="px-4 py-2.5">
        <span className="tabular-nums">{due}</span>
        {/* 🔒 ПРОСРОЧКА НАЗВАНА СЛОВОМ, А НЕ ТОЛЬКО ЦВЕТОМ: цвет не читается
            дальтоником и пропадает в печати. */}
        {isOverdue && (
          <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-[10px] font-normal">
            {ui.overdue}
          </Badge>
        )}
        {isToday && (
          <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] font-normal">
            {ui.today}
          </Badge>
        )}
      </td>

      <td className="px-4 py-2.5">{statusWord(row.status, ui)}</td>

      {/* 🔒 КРУЖОЧЕК СПРАВА, КАК ПОПРОСИЛ ВЛАДЕЛЕЦ, И ТОЛЬКО У ТЕХ, ЧТО ЕЩЁ НЕ УШЛИ.
          У задачи со статусом «связались» сообщение уже у человека: галочка рядом с ней
          обещала бы отмену того, что отменить нельзя. */}
      <td className="w-10 px-4 py-2.5 text-right">
        {["new", "in_progress", "postponed"].includes(row.status) && (
          <Checkbox
            checked={selected}
            aria-label={ui.selectRow}
            onCheckedChange={v => onSelect(row.id, Boolean(v))}
            className="rounded-full"
          />
        )}
      </td>
    </tr>
  )
}
