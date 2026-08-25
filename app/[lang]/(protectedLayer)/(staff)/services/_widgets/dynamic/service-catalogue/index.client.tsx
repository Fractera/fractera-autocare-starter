"use client"

// ВИДЖЕТ «каталог услуг» — единица владения: выборка, скелетон, строка, форматы,
// слова. Снеси папку маршрута — виджет исчезнет целиком.

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Metric, Small } from "@/components/ui/typography"
import { Search, X } from "lucide-react"
import { useCatalogue } from "./use-catalogue"
import { CatalogueSkeleton } from "./skeleton"
import { ServiceRow } from "./row.client"
import type { ServiceCatalogueUi } from "./ui.i18n"

const ALL = "__all__"

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <Metric className="tabular-nums">{value}</Metric>
      <Small className="text-muted-foreground">{label}</Small>
    </div>
  )
}

export function ServiceCatalogue({ ui }: { ui: ServiceCatalogueUi }) {
  const { loading, services, categories, summary, query, setQuery, applied, category, saving, load, save } = useCatalogue(ui)
  const cols = {
    colService: ui.colService, colVisits: ui.colVisits, colPeople: ui.colPeople,
    colRevenue: ui.colRevenue, colLast: ui.colLast,
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-6">
        <Stat value={summary.total} label={ui.sumTotal} />
        <Stat value={summary.withProtocol} label={ui.sumWithProtocol} />
        <Stat value={summary.courses} label={ui.sumCourses} />
        <Stat value={summary.uncategorised} label={ui.sumUncategorised} />
        {summary.excluded > 0 && <Stat value={summary.excluded} label={ui.sumExcluded} />}
      </div>

      {/* 🔒 ДОЛГ ПО ПРОТОКОЛАМ НАЗВАН, ПОКА ОН ПОЛНЫЙ. Каталог из 129 услуг без
          единого протокола выглядит наполненным — числа же есть. Сказать об этом
          обязан экран, иначе долг не увидит никто. */}
      {summary.total > 0 && summary.withProtocol === 0 && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          {ui.protocolDebt}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && load({ q: query, category })}
          placeholder={ui.searchPlaceholder}
          className="h-8 max-w-xs text-xs"
        />
        <Button size="sm" variant="secondary" disabled={loading} onClick={() => load({ q: query, category })}>
          <Search size={12} />{ui.search}
        </Button>

        {categories.length > 0 && (
          <Select
            value={category || ALL}
            onValueChange={v => load({ q: applied, category: v === ALL ? "" : v })}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL} className="text-xs">{ui.allCategories}</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {(applied || category) && (
          <Button size="sm" variant="ghost" disabled={loading} onClick={() => { setQuery(""); void load() }}>
            <X size={12} />{ui.reset}
          </Button>
        )}
      </div>

      {loading ? (
        <CatalogueSkeleton labels={cols} />
      ) : services.length === 0 ? (
        <EmptyState
          title={applied || category ? ui.emptySearch : ui.empty}
          hint={applied || category ? undefined : ui.emptyHint}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[40rem] text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colService}</th>
                <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colVisits}</th>
                <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colPeople}</th>
                <th className="w-32 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colRevenue}</th>
                <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colLast}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((row, i) => (
                <ServiceRow
                  key={row.id}
                  row={row}
                  ui={ui}
                  striped={i % 2 !== 0}
                  saving={saving === row.id}
                  onSave={patch => save(row.id, patch)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
