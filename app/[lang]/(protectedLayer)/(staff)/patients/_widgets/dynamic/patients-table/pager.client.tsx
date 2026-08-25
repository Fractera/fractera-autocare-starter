"use client"

// Подвал таблицы людей: сколько строк в выборке и переходы по страницам.
//
// 🔒 СВОЙ, А НЕ ОБЩИЙ, но по составу — как у соседних списков: счёт слева,
// выбор размера страницы и переходы справа.
//
// 🔒 ПАГИНАЦИЯ ВИДНА ВСЕГДА, даже когда страница одна. Правило «не показывать
// бесполезное» однажды спрятало её целиком, и владелец решил, что функция не
// сделана: невидимый элемент неотличим от несуществующего. Погашенная стрелка
// сообщает две вещи разом — управление есть, и дальше идти некуда.

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationNext, PaginationPrevious, PaginationFirst, PaginationLast,
} from "@/components/ui/pagination"
import { Small } from "@/components/ui/typography"
import { PAGE_SIZES } from "./use-list"
import type { PatientsTableUi } from "./ui.i18n"

export function PatientsPager(
  { ui, total, page, pages, perPage, searching, onPage, onSize }: {
    ui: PatientsTableUi
    total: number
    page: number
    pages: number
    perPage: number
    /** Идёт ли поиск: подпись под таблицей тогда другая. */
    searching: boolean
    onPage: (p: number) => void
    onSize: (s: number) => void
  },
) {
  // «Всего людей» и «Найдено» — разные утверждения. Одна подпись на оба случая
  // означала бы, что после поиска экран сообщает неправду о размере базы.
  const label = (searching ? ui.found : ui.count).replace("{count}", String(total))

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <Small>{label}</Small>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <div className="flex items-center gap-1">
          <span className="hidden text-[10px] text-muted-foreground sm:inline">{ui.perPage}</span>
          <Select value={String(perPage)} onValueChange={v => onSize(Number(v))}>
            <SelectTrigger className="h-7 w-[60px] px-2 text-xs" aria-label={ui.perPage}><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => (
                <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationFirst
                title={ui.first}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                onClick={() => onPage(1)}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationPrevious
                title={ui.prev}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                onClick={() => onPage(page - 1)}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-1 text-[10px] tabular-nums text-muted-foreground sm:hidden">
                {page}/{pages}
              </span>
              <span className="hidden px-2 text-[10px] text-muted-foreground sm:inline">
                {ui.pageOf.replace("{page}", String(page)).replace("{pages}", String(pages))}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                title={ui.next}
                aria-disabled={page >= pages}
                className={page >= pages ? "pointer-events-none opacity-40" : ""}
                onClick={() => onPage(page + 1)}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLast
                title={ui.last}
                aria-disabled={page >= pages}
                className={page >= pages ? "pointer-events-none opacity-40" : ""}
                onClick={() => onPage(pages)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
