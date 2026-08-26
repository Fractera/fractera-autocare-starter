"use client"

import { useState } from "react"

// ВИДЖЕТ «очередь задач» — динамический островок в статической странице.
//
// 🔒 ЕДИНИЦА ВЛАДЕНИЯ: выборка, скелетон, вкладки, строка, подвал, форматы,
// слова — всё в этой папке. Снеси папку маршрута — виджет исчезнет целиком.
//
// 🔒 РИТМ ВЗЯТ У СОСЕДЕЙ. Фрагменты между виджетами не делятся, но шапка,
// чередование строк и подвал такие же, как у таблицы людей: изоляция файлов не
// даёт права выглядеть чужим на своём же сайте.

import { EmptyState } from "@/components/ui/empty-state"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationNext, PaginationPrevious, PaginationFirst, PaginationLast,
} from "@/components/ui/pagination"
import { Small } from "@/components/ui/typography"
import { useTasksQueue, PAGE_SIZES, type Scope } from "./use-queue"
import { TasksQueueSkeleton } from "./skeleton"
import { QueueTabs } from "./tabs.client"
import { QueueRow } from "./row.client"
import { CancelBar } from "./cancel-bar.client"
import type { TasksQueueUi } from "./ui.i18n"
import type { AppDialogUi } from "@/components/dialog/app-dialog.i18n"

export function TasksQueue({ lang, ui, dialogUi }: { lang: string; ui: TasksQueueUi; dialogUi: AppDialogUi }) {
  const { loading, rows, total, counts, scope, page, pages, perPage, load, changeSize } = useTasksQueue(ui)
  // 🔒 ВЫБОР ЖИВЁТ ЗДЕСЬ, А НЕ В СТРОКЕ: полоса отмены должна знать обо всех выбранных
  // сразу, а строка знает только о себе.
  const [picked, setPicked] = useState<string[]>([])
  const cols = { colPerson: ui.colPerson, colReason: ui.colReason, colDue: ui.colDue, colStatus: ui.colStatus }

  // 🔒 ПУСТО В ОТБОРЕ И ПУСТО В БАЗЕ — РАЗНЫЕ СОБЫТИЯ. «На сегодня работы нет» —
  // это хорошая новость; «задач ещё не заводили» — это состояние продукта, и
  // говорить их одной фразой значит скрывать от сотрудника, что происходит.
  const empty = counts.all === 0
    ? { title: ui.emptyAll, hint: ui.emptyAllHint }
    : scope === "today" ? { title: ui.emptyToday, hint: ui.emptyTodayHint }
    : scope === "open" ? { title: ui.emptyOpen, hint: undefined }
    : { title: ui.emptyDone, hint: undefined }

  return (
    <>
      <QueueTabs
        ui={ui}
        scope={scope}
        counts={counts}
        loading={loading}
        onScope={(s: Scope) => void load({ scope: s, page: 1 })}
      />

      {loading ? (
        <TasksQueueSkeleton labels={cols} />
      ) : rows.length === 0 ? (
        <EmptyState title={empty.title} hint={empty.hint} />
      ) : (
        <>
          {/* Полоса отмены — НАД таблицей: её ищут глазами до того, как начнут выбирать. */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CancelBar ui={ui} dialogUi={dialogUi} selected={picked} onDone={() => { setPicked([]); void load() }} />
            {picked.length > 0 && (
              <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setPicked([])}>
                {ui.confirmKeep}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[38rem] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colPerson}</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colReason}</th>
                  <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colDue}</th>
                  <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colStatus}</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <QueueRow
                    key={row.id}
                    row={row}
                    ui={ui}
                    lang={lang}
                    striped={i % 2 !== 0}
                    selected={picked.includes(row.id)}
                    onSelect={(id, on) => setPicked(p => (on ? [...p, id] : p.filter(x => x !== id)))}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Small>{ui.count.replace("{count}", String(total))}</Small>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-1">
                <span className="hidden text-[10px] text-muted-foreground sm:inline">{ui.perPage}</span>
                <Select value={String(perPage)} onValueChange={v => changeSize(Number(v))}>
                  <SelectTrigger className="h-7 w-[60px] px-2 text-xs" aria-label={ui.perPage}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map(s => (
                      <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Пагинация видна всегда, даже когда страница одна: невидимый
                  элемент неотличим от несуществующего. */}
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationFirst title={ui.first} aria-disabled={page <= 1}
                      className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                      onClick={() => load({ page: 1 })} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationPrevious title={ui.prev} aria-disabled={page <= 1}
                      className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                      onClick={() => load({ page: page - 1 })} />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-1 text-[10px] tabular-nums text-muted-foreground sm:hidden">{page}/{pages}</span>
                    <span className="hidden px-2 text-[10px] text-muted-foreground sm:inline">
                      {ui.pageOf.replace("{page}", String(page)).replace("{pages}", String(pages))}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext title={ui.next} aria-disabled={page >= pages}
                      className={page >= pages ? "pointer-events-none opacity-40" : ""}
                      onClick={() => load({ page: page + 1 })} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLast title={ui.last} aria-disabled={page >= pages}
                      className={page >= pages ? "pointer-events-none opacity-40" : ""}
                      onClick={() => load({ page: pages })} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </>
      )}
    </>
  )
}
