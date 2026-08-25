"use client"

// Форма нового правила.
//
// 🔒 ПОЛЯ ОБЪЯСНЕНЫ ПОД СОБОЙ, А НЕ ПОДСКАЗКОЙ ПРИ НАВЕДЕНИИ: «цель контакта» и
// «порог в днях» — не очевидные слова, а подсказка под пальцем недоступна.
//
// 🔒 МЁРТВЫЙ ТРИГГЕР ПОМЕЧЕН ПРЯМО В ВЫБОРЕ. Запрещать его нельзя — данные могут
// появиться, — но выбрать его молча значит завести правило, которое не выстрелит
// ни разу, и ждать результата месяцами.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { triggerWord, type ScenarioRulesUi } from "./ui.i18n"

export function RuleForm(
  { ui, triggers, dead, busy, onCancel, onSave }: {
    ui: ScenarioRulesUi
    triggers: string[]
    dead: string[]
    busy: boolean
    onCancel: () => void
    onSave: (body: unknown) => void
  },
) {
  const [title, setTitle] = useState("")
  const [trigger, setTrigger] = useState(triggers[0] ?? "no_visit_for_days")
  const [offset, setOffset] = useState("60")
  const [direction, setDirection] = useState("")
  const [goal, setGoal] = useState("")

  const isDead = dead.includes(trigger)

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">{ui.fTitle}</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 h-8 text-xs" />
          <p className="mt-1 text-[11px] text-muted-foreground">{ui.fTitleHint}</p>
        </div>

        <div>
          <Label className="text-xs">{ui.fTrigger}</Label>
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {triggers.map(t => (
                <SelectItem key={t} value={t} className="text-xs">
                  {triggerWord(t, ui)}{dead.includes(t) ? " 🔴" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isDead && <p className="mt-1 text-[11px] text-destructive">{ui.noDataTrigger}</p>}
        </div>

        <div>
          <Label className="text-xs">{ui.fOffset}</Label>
          <Input
            value={offset}
            onChange={e => setOffset(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            className="mt-1 h-8 text-xs"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{ui.fOffsetHint}</p>
        </div>

        <div>
          <Label className="text-xs">{ui.fDirection}</Label>
          <Input value={direction} onChange={e => setDirection(e.target.value)} className="mt-1 h-8 text-xs" />
          <p className="mt-1 text-[11px] text-muted-foreground">{ui.fDirectionHint}</p>
        </div>

        <div className="sm:col-span-2">
          <Label className="text-xs">{ui.fGoal}</Label>
          <Textarea value={goal} onChange={e => setGoal(e.target.value)} rows={2} className="mt-1 text-xs" />
          <p className="mt-1 text-[11px] text-muted-foreground">{ui.fGoalHint}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => onSave({
            title, triggerType: trigger, daysOffset: Number(offset) || 0,
            serviceDirection: direction || null, messageGoal: goal,
          })}
        >
          {ui.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>{ui.cancel}</Button>
      </div>
    </div>
  )
}
