"use client"

// ВИДЖЕТ «обзор смены» — первый экран рабочего дня.
//
// 🔒 ЭТО НЕ АНАЛИТИКА. Аналитика отвечает «как идут дела у клиники»; обзор — «что
// мне делать сейчас и работает ли то, что мы завели». Разные вопросы: склеить их
// в один экран значит не ответить ни на один.
//
// 🔒 СВЕЖЕСТЬ ДАННЫХ НАЗВАНА ПЕРВОЙ СТРОКОЙ. Все числа ниже посчитаны по тому,
// что привезла синхронизация; если она не приходила сутки, экран обязан сказать
// это раньше, чем покажет цифры.

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { H4, Metric, Small } from "@/components/ui/typography"
import type { ShiftOverviewUi } from "./ui.i18n"

type Data = {
  queue: { dueToday: number; overdue: number; open: number }
  result: { booked: number; done: number; conversion: number | null }
  rules: { active: number; all: number }
  base: { people: number; refused: number; incoming: number }
  lastSyncAt: string | null
}

function Tile(
  { value, label, hint, tone = "plain" }: { value: React.ReactNode; label: string; hint?: string; tone?: "plain" | "warn" },
) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "warn" ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
      <Metric className="tabular-nums">{value}</Metric>
      <Small className="text-foreground">{label}</Small>
      {hint && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

function when(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]}` : iso
}

export function ShiftOverview({ lang, ui }: { lang: string; ui: ShiftOverviewUi }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Data | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/care/dashboard", { cache: "no-store" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(res.status === 401 || res.status === 403 ? ui.forbidden : res.status === 502 ? ui.unreachable : ui.failed)
        return
      }
      setData(j as Data)
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setLoading(false)
    }
  }, [ui])

  const started = useRef(false)
  useEffect(() => { if (started.current) return; started.current = true; void load() }, [load])

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <Skeleton className="h-7 w-20" /><Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
    )
  }

  if (!data) return <EmptyState title={ui.failed} />

  const stale = data.lastSyncAt
    ? (Date.now() - Date.parse(data.lastSyncAt)) > 24 * 3600 * 1000
    : true

  return (
    <div className="space-y-8">
      <p className={`text-[11px] ${stale ? "text-destructive" : "text-muted-foreground"}`}>
        {!data.lastSyncAt
          ? ui.syncNever
          : stale
            ? `${ui.syncStale} ${ui.syncAt}: ${when(data.lastSyncAt)}`
            : `${ui.syncAt}: ${when(data.lastSyncAt)}`}
      </p>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <H4 variant="ui">{ui.queueTitle}</H4>
          <Link href={`/${lang}/tasks`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            {ui.toQueue}
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile value={data.queue.dueToday} label={ui.dueToday} hint={ui.dueTodayHint} />
          <Tile
            value={data.queue.overdue}
            label={ui.overdue}
            hint={ui.overdueHint}
            tone={data.queue.overdue > 0 ? "warn" : "plain"}
          />
          <Tile value={data.queue.open} label={ui.openTasks} hint={ui.openTasksHint} />
        </div>
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.resultTitle}</H4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile value={data.result.booked} label={ui.booked} hint={ui.bookedHint} />
          <Tile value={data.result.done} label={ui.done} hint={ui.doneHint} />
          {data.result.conversion === null ? (
            <div className="rounded-xl border border-border p-4">
              <Small className="text-muted-foreground">{ui.noConversion}</Small>
            </div>
          ) : (
            <Tile value={`${data.result.conversion}%`} label={ui.conversion} hint={ui.conversionHint} />
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <H4 variant="ui">{ui.rulesTitle}</H4>
          <Link href={`/${lang}/scenarios`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            {ui.toRules}
          </Link>
        </div>
        {data.rules.all === 0 ? (
          <EmptyState title={ui.noRules} hint={ui.noRulesHint} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Tile
              value={`${data.rules.active} / ${data.rules.all}`}
              label={ui.activeRules}
              hint={ui.activeRulesHint}
              tone={data.rules.active === 0 ? "warn" : "plain"}
            />
          </div>
        )}
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.baseTitle}</H4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile value={data.base.people} label={ui.people} />
          <Tile value={data.base.refused} label={ui.refused} hint={ui.refusedHint} />
          <Tile value={data.base.incoming} label={ui.incoming} hint={ui.incomingHint} />
        </div>
      </section>
    </div>
  )
}
