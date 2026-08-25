"use client"

// Строка каталога: услуга, её мера и правка протокола.

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { money, humanDate } from "./format"
import type { Service } from "./use-catalogue"
import type { ServiceCatalogueUi } from "./ui.i18n"

export function ServiceRow(
  { row, ui, striped, saving, onSave }: {
    row: Service
    ui: ServiceCatalogueUi
    striped: boolean
    saving: boolean
    onSave: (patch: unknown) => Promise<boolean>
  },
) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(row.category ?? "")
  const [protocol, setProtocol] = useState(row.protocol_text ?? "")
  const [isCourse, setIsCourse] = useState(Boolean(row.is_course))
  const [excluded, setExcluded] = useState(Boolean(row.excluded))

  const hasProtocol = Boolean(row.protocol_text?.trim())

  return (
    <>
      <tr className={`border-b border-border ${striped ? "bg-muted/20" : ""} ${row.excluded ? "opacity-60" : ""}`}>
        <td className="px-4 py-2.5">
          <div className="font-medium">{row.service_title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {row.category && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">{row.category}</Badge>
            )}
            {Boolean(row.is_course) && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">{ui.course}</Badge>
            )}
            {Boolean(row.excluded) && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">{ui.excluded}</Badge>
            )}
            {/* 🔒 ОТСУТСТВИЕ ПРОТОКОЛА НАЗВАНО, А НЕ ОСТАВЛЕНО ПУСТЫМ МЕСТОМ.
                Это долг, который видно только если о нём сказать: без протокола
                оператору нечего сказать человеку сверх «приходите». */}
            <Badge
              variant={hasProtocol ? "secondary" : "destructive"}
              className="px-1.5 py-0 text-[10px] font-normal"
            >
              {hasProtocol ? ui.hasProtocol : ui.noProtocol}
            </Badge>
          </div>
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums">{row.visits}</td>
        <td className="px-4 py-2.5 text-right tabular-nums">{row.people}</td>
        <td className="px-4 py-2.5 text-right tabular-nums">{money(row.revenue)}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="tabular-nums">{humanDate(row.last_used) ?? "—"}</span>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setOpen(o => !o)}>
              {ui.edit}
            </Button>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-border bg-muted/10">
          <td colSpan={5} className="px-4 py-4">
            <p className="mb-3 text-[11px] text-muted-foreground">{ui.titleLocked}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">{ui.fCategory}</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>
              <div className="flex flex-col justify-center gap-2">
                <label className="flex items-start gap-2">
                  <Checkbox checked={isCourse} onCheckedChange={v => setIsCourse(Boolean(v))} className="mt-0.5" />
                  <span className="text-xs">
                    {ui.fCourse}
                    <span className="block text-[11px] text-muted-foreground">{ui.fCourseHint}</span>
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <Checkbox checked={excluded} onCheckedChange={v => setExcluded(Boolean(v))} className="mt-0.5" />
                  <span className="text-xs">
                    {ui.fExcluded}
                    <span className="block text-[11px] text-muted-foreground">{ui.fExcludedHint}</span>
                  </span>
                </label>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">{ui.fProtocol}</Label>
                <Textarea value={protocol} onChange={e => setProtocol(e.target.value)} rows={3} className="mt-1 text-xs" />
                <p className="mt-1 text-[11px] text-muted-foreground">{ui.fProtocolHint}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={saving}
                onClick={async () => {
                  const ok = await onSave({ category, protocolText: protocol, isCourse, excluded })
                  if (ok) setOpen(false)
                }}
              >
                {ui.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>{ui.cancel}</Button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
