"use client"

// Управление таблицей людей: заголовок и поиск.
//
// 🔒 СВОЁ, А НЕ ОБЩЕЕ — но форма ТА ЖЕ, что у соседних таблиц, и это не
// противоречие. Изоляция означает, что фрагменты не делятся между виджетами;
// она не означает, что страницы одного продукта имеют право выглядеть чужими
// друг другу.
//
// Отличий от образца два, и оба по существу: здесь нет кнопки раскрытия —
// список открыт сразу (см. `use-list.ts`), — и есть сброс поиска, потому что
// применённое состояние у нас своё и от него есть от чего отказаться.

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { H4 } from "@/components/ui/typography"
import { Search, X } from "lucide-react"
import type { PatientsTableUi } from "./ui.i18n"

export function PatientsToolbar(
  { ui, loading, query, applied, onQuery, onSearch, onReset }: {
    ui: PatientsTableUi
    loading: boolean
    query: string
    applied: string
    onQuery: (v: string) => void
    onSearch: () => void
    onReset: () => void
  },
) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <H4 variant="ui">{ui.tableTitle}</H4>
      </div>

      <div className="mb-3 flex gap-2">
        <Input
          value={query}
          onChange={e => onQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSearch()}
          placeholder={ui.searchPlaceholder}
          className="h-8 max-w-xs text-xs"
        />
        <Button size="sm" variant="secondary" onClick={onSearch} disabled={loading}>
          <Search size={12} />{ui.search}
        </Button>
        {/* Сброс появляется только когда есть что сбрасывать: кнопка, ничего не
            меняющая, учит не доверять кнопкам. */}
        {applied && (
          <Button size="sm" variant="ghost" onClick={onReset} disabled={loading}>
            <X size={12} />{ui.reset}
          </Button>
        )}
      </div>
    </>
  )
}
