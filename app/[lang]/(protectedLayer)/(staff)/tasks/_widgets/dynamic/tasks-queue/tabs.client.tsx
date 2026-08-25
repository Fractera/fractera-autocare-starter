"use client"

// Вкладки отбора со счётчиками.
//
// 🔒 СЧЁТЧИК СТОИТ НА ВКЛАДКЕ, А НЕ ПОД НЕЙ. Сотрудник открывает этот экран,
// чтобы узнать «сколько мне сегодня работать»; ответ обязан быть виден до
// всякого нажатия.

import { Button } from "@/components/ui/button"
import type { Scope, Counts } from "./use-queue"
import type { TasksQueueUi } from "./ui.i18n"

export function QueueTabs(
  { ui, scope, counts, loading, onScope }: {
    ui: TasksQueueUi
    scope: Scope
    counts: Counts
    loading: boolean
    onScope: (s: Scope) => void
  },
) {
  const tabs: { key: Scope; label: string; n: number }[] = [
    { key: "today", label: ui.tabToday, n: counts.today },
    { key: "open", label: ui.tabOpen, n: counts.open },
    { key: "done", label: ui.tabDone, n: counts.done },
    { key: "all", label: ui.tabAll, n: counts.all },
  ]

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {tabs.map(t => (
        <Button
          key={t.key}
          size="sm"
          variant={scope === t.key ? "default" : "ghost"}
          disabled={loading}
          onClick={() => onScope(t.key)}
        >
          {t.label}
          <span className="ml-1.5 tabular-nums opacity-70">{t.n}</span>
        </Button>
      ))}
    </div>
  )
}
