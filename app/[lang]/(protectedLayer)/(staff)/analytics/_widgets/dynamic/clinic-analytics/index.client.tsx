"use client"

// ВИДЖЕТ «аналитика» — единица владения: выборка, плитки, разрезы, слова.
//
// 🔒 КАЖДОЕ ЧИСЛО ИДЁТ С ОБЪЯСНЕНИЕМ, как на экране аудита. Голое число не
// отвечает ни на что: «1620» под словом «без записи вперёд» значит одно, а под
// словами «это те, кого можно потерять» — другое.
//
// 🔒 ДОЛЯ РИСУЕТСЯ ПОЛОСОЙ, А НЕ ГРАФИКОМ. Шесть корзин давности читаются как ряд
// полос без единой внешней библиотеки; график здесь был бы украшением, за которое
// платит вес страницы.

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { H4, Metric, Small } from "@/components/ui/typography"
import type { ClinicAnalyticsUi } from "./ui.i18n"

type Data = {
  people: number
  peopleWithVisits: number
  noFutureBooking: number
  recency: { d0_30: number; d31_90: number; d91_180: number; d181_365: number; d365plus: number; never: number }
  attendance: { came: number; missed: number; unknown: number; missedShare: number | null }
  revenue: { total: number; visits: number; avgCheck: number; excludedRevenue: number }
  topServices: { title: string; visits: number; revenue: number }[]
  byStaff: { name: string; visits: number; revenue: number }[]
}

function money(v: number): string {
  return Math.round(v || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")
}

function pctWidth(part: number, whole: number): string {
  const pct = whole > 0 ? Math.round((part / whole) * 100) : 0
  return pct + "%"
}

function Tile(
  { value, label, hint, tone = "plain" }: { value: React.ReactNode; label: string; hint: string; tone?: "plain" | "warn" },
) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "warn" ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
      <Metric className="tabular-nums">{value}</Metric>
      <Small className="text-foreground">{label}</Small>
      {hint && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Bar({ label, n, max }: { label: string; n: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground/70" style={{ width: pctWidth(n, max) }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums">{n}</span>
    </div>
  )
}

export function ClinicAnalytics({ ui }: { ui: ClinicAnalyticsUi }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Data | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/care/analytics", { cache: "no-store" })
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
        {Array.from({ length: 6 }, (_, j) => (
          <div key={j} className="rounded-xl border border-border p-4">
            <Skeleton className="h-7 w-24" /><Skeleton className="mt-2 h-3 w-28" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.people === 0) return <EmptyState title={ui.empty} hint={ui.emptyHint} />

  const r = data.recency
  const maxBucket = Math.max(r.d0_30, r.d31_90, r.d91_180, r.d181_365, r.d365plus, r.never)
  const topRevenue = data.topServices[0]?.revenue ?? 0

  return (
    <div className="space-y-8">
      <section>
        <H4 variant="ui" className="mb-3">{ui.moneyTitle}</H4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile value={money(data.revenue.total)} label={ui.revenue} hint={ui.revenueHint} />
          <Tile value={data.revenue.visits} label={ui.visits} hint={ui.visitsHint} />
          <Tile value={money(data.revenue.avgCheck)} label={ui.avgCheck} hint={ui.avgCheckHint} />
          {data.revenue.excludedRevenue > 0 && (
            <Tile value={money(data.revenue.excludedRevenue)} label={ui.excludedRevenue} hint={ui.excludedRevenueHint} />
          )}
        </div>
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.baseTitle}</H4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile value={data.people} label={ui.people} hint={ui.peopleHint} />
          <Tile value={data.peopleWithVisits} label={ui.peopleWithVisits} hint={ui.peopleWithVisitsHint} />
          <Tile value={data.noFutureBooking} label={ui.noFuture} hint={ui.noFutureHint} tone="warn" />
        </div>
      </section>

      <section>
        <H4 variant="ui" className="mb-1">{ui.recencyTitle}</H4>
        <p className="mb-3 text-[11px] text-muted-foreground">{ui.recencyHint}</p>
        <div className="space-y-2 rounded-xl border border-border p-4">
          <Bar label={ui.r0_30} n={r.d0_30} max={maxBucket} />
          <Bar label={ui.r31_90} n={r.d31_90} max={maxBucket} />
          <Bar label={ui.r91_180} n={r.d91_180} max={maxBucket} />
          <Bar label={ui.r181_365} n={r.d181_365} max={maxBucket} />
          <Bar label={ui.r365plus} n={r.d365plus} max={maxBucket} />
          <Bar label={ui.rNever} n={r.never} max={maxBucket} />
        </div>
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.attendanceTitle}</H4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile value={data.attendance.came} label={ui.came} hint="" />
          <Tile value={data.attendance.missed} label={ui.missed} hint="" />
          <Tile value={data.attendance.unknown} label={ui.unknownAtt} hint={ui.unknownAttHint} />
          <Tile
            value={data.attendance.missedShare === null ? "—" : data.attendance.missedShare + "%"}
            label={ui.missedShare}
            hint={ui.missedShareHint}
          />
        </div>
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.topTitle}</H4>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[32rem] text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colService}</th>
                <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colVisits}</th>
                <th className="w-40 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colRevenue}</th>
              </tr>
            </thead>
            <tbody>
              {data.topServices.map((s, i) => (
                <tr key={s.title} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-2.5">{s.title}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.visits}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-foreground/70" style={{ width: pctWidth(s.revenue, topRevenue) }} />
                      </div>
                      <span className="tabular-nums">{money(s.revenue)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.staffTitle}</H4>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[32rem] text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colStaff}</th>
                <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colVisits}</th>
                <th className="w-40 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colRevenue}</th>
              </tr>
            </thead>
            <tbody>
              {data.byStaff.map((s, i) => (
                <tr key={s.name} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.visits}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
