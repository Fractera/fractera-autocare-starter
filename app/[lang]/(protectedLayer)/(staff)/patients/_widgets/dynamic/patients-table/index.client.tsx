"use client"

// ВИДЖЕТ «база людей» — динамический островок в статической странице.
//
// 🔒 ЭТО ЕДИНИЦА ВЛАДЕНИЯ. Всё, что отвечает на вопрос «как выглядит и ведёт
// себя ЭТА таблица», лежит в этой папке: выборка, скелетон, строка, подвал,
// управление, форматы, слова. Снеси папку маршрута — виджет исчезнет целиком,
// не оставив ссылок; это и есть его приёмка.
//
// 🔒 ИЗОЛЯЦИЯ ФАЙЛОВ, А НЕ ЧУЖЕРОДНОСТЬ ВИДА. Фрагменты между виджетами не
// делятся — но ритм отступов, шапка таблицы, чередование строк и порядок
// управления взяты такими же, как у таблицы учётных записей. ✗ Собранная «в
// своём ритме» страница формально верна и читается как кусок другого сайта.

import { EmptyState } from "@/components/ui/empty-state"
import { usePatientsList } from "./use-list"
import { PatientsRow } from "./row.client"
import { PatientsTableSkeleton } from "./skeleton"
import { PatientsToolbar } from "./toolbar.client"
import { PatientsPager } from "./pager.client"
import type { PatientsTableUi } from "./ui.i18n"

export function PatientsTable({ lang, ui }: { lang: string; ui: PatientsTableUi }) {
  const {
    loading, rows, total, page, pages, perPage,
    query, setQuery, applied, load, changeSize, reset,
  } = usePatientsList(ui)

  const cols = {
    colPerson: ui.colPerson,
    colVisits: ui.colVisits,
    colLastVisit: ui.colLastVisit,
    colAhead: ui.colAhead,
    colSpent: ui.colSpent,
  }

  return (
    <>
      <PatientsToolbar
        ui={ui}
        loading={loading}
        query={query}
        applied={applied}
        onQuery={setQuery}
        onSearch={() => void load({ page: 1, q: query })}
        onReset={reset}
      />

      {loading ? (
        /* Скелетон держит ТУ ЖЕ форму, что и ответ: те же колонки, те же
           заголовки. Форма загрузки, не совпадающая с формой ответа, даёт
           скачок разметки в момент прихода данных. */
        <PatientsTableSkeleton labels={cols} />
      ) : rows.length === 0 ? (
        /* Пусто по поиску и пусто в базе — РАЗНЫЕ события. Одна фраза на оба
           заставила бы сотрудника решить, что синхронизация не сработала, хотя
           он просто ошибся в фамилии. */
        <EmptyState title={applied ? ui.emptySearch : ui.empty} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[42rem] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colPerson}</th>
                  <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colVisits}</th>
                  <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colLastVisit}</th>
                  <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colAhead}</th>
                  <th className="w-32 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colSpent}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <PatientsRow key={row.id} row={row} ui={ui} lang={lang} striped={i % 2 !== 0} />
                ))}
              </tbody>
            </table>
          </div>

          <PatientsPager
            ui={ui}
            total={total}
            page={page}
            pages={pages}
            perPage={perPage}
            searching={Boolean(applied)}
            onPage={p => load({ page: p, q: applied })}
            onSize={changeSize}
          />
        </>
      )}
    </>
  )
}
