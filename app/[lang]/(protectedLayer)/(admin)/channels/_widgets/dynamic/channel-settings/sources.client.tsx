"use client"

// ШЕСТЬ ИСТОЧНИКОВ, КОТОРЫМИ ОТВЕТУ РАЗРЕШЕНО ПОЛЬЗОВАТЬСЯ (шаг 32).
//
// 🔒 РЯДОМ С КАЖДЫМ — СОСТОЯНИЕ ЕГО СЛУЖБЫ, и это не украшение. Потребитель этих
// переключателей (составление ответа моделью) ещё не построен: без показа живости они были
// бы мёртвыми выключателями — тем самым, что в проекте уже оплачено шагом 522. Живость
// делает их честными СЕГОДНЯ: включённый источник, чья служба молчит, виден сразу.

import { HelpCircle, CircleCheck, CircleAlert } from "lucide-react"
// 🔒 `Checkbox` ПРОЕКТА, А НЕ НОВЫЙ `Switch`. Владелец сказал «чекбоксы», и примитив с
// таким поведением в проекте уже есть — им переключают в каталоге услуг. Ставить рядом
// второй способ отвечать «да/нет» значило бы, что два экрана спрашивают одно разными
// органами управления.
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Small } from "@/components/ui/typography"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import type { ChannelSettingsUi } from "./ui.i18n"

export type Health = { name: string; reachable: boolean; detail: string }

export function Sources(
  { ui, sources, health, disabled, onToggle }: {
    ui: ChannelSettingsUi
    sources: Record<string, boolean>
    health: Health[]
    disabled: boolean
    onToggle: (name: string, on: boolean) => void
  },
) {
  return (
    <div className="mt-5 flex flex-col gap-4">
      {Object.entries(ui.sources).map(([name, copy]) => {
        const h = health.find(x => x.name === name)
        return (
          <div key={name} className="flex items-start gap-3">
            <Checkbox
              id={`src-${name}`}
              checked={Boolean(sources[name])}
              disabled={disabled}
              onCheckedChange={v => onToggle(name, Boolean(v))}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor={`src-${name}`} className="cursor-pointer">{copy.label}</Label>

                {/* 🔒 ВОПРОСИК ОТКРЫВАЕТСЯ ПО НАЖАТИЮ, А НЕ ПО НАВЕДЕНИЮ. Тот же урок, что
                    с ролями в ящике аккаунта: всплывающее по наведению нельзя ни прочитать
                    не торопясь, ни открыть пальцем — а здесь три абзаца объяснения. */}
                <Popover>
                  <PopoverTrigger
                    aria-label={copy.label}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <HelpCircle className="size-3.5" />
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-80 text-xs leading-relaxed">
                    <p className="font-medium text-foreground">{copy.label}</p>
                    <p className="mt-2 text-muted-foreground">{copy.what}</p>
                    <p className="mt-2 text-muted-foreground"><span className="text-foreground">Как работает: </span>{copy.how}</p>
                    <p className="mt-2 text-muted-foreground"><span className="text-foreground">Зачем нужно: </span>{copy.why}</p>
                  </PopoverContent>
                </Popover>

                {h && (
                  <span className={`inline-flex items-center gap-1 text-[10px] ${h.reachable ? "text-muted-foreground" : "text-destructive"}`}>
                    {h.reachable ? <CircleCheck className="size-3" /> : <CircleAlert className="size-3" />}
                    {h.reachable ? ui.reachable : ui.unreachable} · {h.detail}
                  </span>
                )}
              </div>
              <Small className="mt-0.5 block text-muted-foreground">{copy.what}</Small>
            </div>
          </div>
        )
      })}
    </div>
  )
}
