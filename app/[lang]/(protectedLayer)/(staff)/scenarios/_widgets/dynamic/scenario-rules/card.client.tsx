"use client"

// Карточка одного правила: что делает, чего добилось, что с ним можно сделать.

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Metric, Small } from "@/components/ui/typography"
import { Loader2, Play, Calculator } from "lucide-react"
import { triggerWord, type ScenarioRulesUi } from "./ui.i18n"
import type { Rule } from "./use-rules"

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <Metric className="tabular-nums">{value}</Metric>
      <Small className="text-muted-foreground">{label}</Small>
    </div>
  )
}

export function RuleCard(
  { rule, ui, dead, busy, count, onCount, onRun, onToggle }: {
    rule: Rule
    ui: ScenarioRulesUi
    dead: string[]
    busy: boolean
    count: number | undefined
    onCount: () => void
    onRun: () => void
    onToggle: (next: boolean) => void
  },
) {
  const isDead = dead.includes(rule.trigger_type)
  const isManual = rule.trigger_type === "manual_segment" || rule.trigger_type === "unfinished_treatment"
  const active = Boolean(rule.is_active)

  // 🔒 ДОЛЯ СЧИТАЕТСЯ ТОЛЬКО КОГДА ЕСТЬ ОТ ЧЕГО. Ноль задач и ноль записей дают
  // 0/0 — не «0%», а «судить не по чему». Показать ноль процентов значило бы
  // обвинить правило в бесполезности, которую никто не проверял.
  const hasMeasure = rule.tasks_total > 0
  const conv = hasMeasure ? Math.round((rule.tasks_booked / rule.tasks_total) * 100) : null

  return (
    <div className={`rounded-xl border p-4 ${active ? "border-border" : "border-border bg-muted/20"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{rule.title}</span>
            <Badge variant={active ? "secondary" : "outline"} className="px-1.5 py-0 text-[10px] font-normal">
              {active ? ui.active : ui.inactive}
            </Badge>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
              {triggerWord(rule.trigger_type, ui)}
              {rule.days_offset ? ` · ${rule.days_offset} дн.` : ""}
            </Badge>
            {rule.service_direction && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                {rule.service_direction}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{rule.message_goal}</p>
        </div>

        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onToggle(!active)}>
          {active ? ui.turnOff : ui.turnOn}
        </Button>
      </div>

      {isDead && <p className="mt-2 text-[11px] text-destructive">{ui.noDataTrigger}</p>}
      {isManual && <p className="mt-2 text-[11px] text-muted-foreground">{ui.manualTrigger}</p>}

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <Stat value={rule.tasks_total} label={ui.tasksTotal} />
        <Stat value={rule.tasks_booked} label={ui.tasksBooked} />
        <Stat value={rule.tasks_open} label={ui.tasksOpen} />
        {conv !== null
          ? <Stat value={`${conv}%`} label={ui.conversion} />
          : <Small className="text-muted-foreground">{ui.noMeasure}</Small>}
      </div>

      {!isManual && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={onCount}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Calculator size={12} />}
            {ui.countNow}
          </Button>
          {count !== undefined && (
            <Small className="tabular-nums">{ui.candidates}: {count}</Small>
          )}
          {/* 🔒 ЗАПУСК ВИДЕН, НО У ВЫКЛЮЧЕННОГО ПРАВИЛА ПОГАШЕН, а не спрятан:
              невидимая кнопка неотличима от несуществующей, и человек решит,
              что запускать правила вообще нельзя. */}
          <Button size="sm" disabled={busy || !active} onClick={onRun} title={active ? undefined : ui.offWontRun}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {busy ? ui.running : ui.run}
          </Button>
        </div>
      )}
    </div>
  )
}
