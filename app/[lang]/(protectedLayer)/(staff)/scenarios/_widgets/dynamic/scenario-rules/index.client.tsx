"use client"

// ВИДЖЕТ «правила очереди» — ядро продукта на экране.
//
// 🔒 ЕДИНИЦА ВЛАДЕНИЯ: выборка, скелетон, карточка, форма, слова — всё здесь.
// Снеси папку маршрута — виджет исчезнет целиком.

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Plus } from "lucide-react"
import { useRules, type RunResult } from "./use-rules"
import { ScenarioRulesSkeleton } from "./skeleton"
import { RuleCard } from "./card.client"
import { RuleForm } from "./form.client"
import type { ScenarioRulesUi } from "./ui.i18n"

export function ScenarioRules({ ui }: { ui: ScenarioRulesUi }) {
  const { loading, rules, dead, triggers, counts, busy, count, run, toggle, create } = useRules(ui)
  const [adding, setAdding] = useState(false)

  /**
   * 🔒 ОТЧЁТ О ЗАПУСКЕ НАЗЫВАЕТ КАЖДЫЙ ОТКАЗ. «Создано 12» без разбивки читается
   * как поломка; с разбивкой — как работа предохранителей. Правило исходника, и
   * оно здесь доходит до глаз человека, а не остаётся в ответе двери.
   */
  const report = (r: RunResult | null) => {
    if (!r) return
    const parts: string[] = []
    if (r.skipped.noConsent) parts.push(ui.skNoConsent.replace("{n}", String(r.skipped.noConsent)))
    if (r.skipped.hasOpenTask) parts.push(ui.skHasOpen.replace("{n}", String(r.skipped.hasOpenTask)))
    if (r.skipped.recentlyContacted) parts.push(ui.skRecent.replace("{n}", String(r.skipped.recentlyContacted)))
    if (r.skipped.unknownPerson) parts.push(ui.skUnknown.replace("{n}", String(r.skipped.unknownPerson)))
    toast.success(ui.ranTitle, {
      description: ui.ranCreated.replace("{n}", String(r.created))
        + (parts.length ? ` · ${ui.ranSkipped} ${parts.join(", ")}` : ""),
    })
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setAdding(a => !a)} disabled={loading}>
          <Plus size={12} />{ui.create}
        </Button>
      </div>

      {adding && (
        <div className="mb-4">
          <RuleForm
            ui={ui}
            triggers={triggers}
            dead={dead}
            busy={busy === "new"}
            onCancel={() => setAdding(false)}
            onSave={async body => { if (await create(body)) setAdding(false) }}
          />
        </div>
      )}

      {loading ? (
        <ScenarioRulesSkeleton />
      ) : rules.length === 0 ? (
        <EmptyState title={ui.empty} hint={ui.emptyHint} />
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              ui={ui}
              dead={dead}
              busy={busy === rule.id}
              count={counts[rule.id]}
              onCount={() => void count(rule.id)}
              onRun={async () => report(await run(rule.id))}
              onToggle={next => void toggle(rule.id, next)}
            />
          ))}
        </div>
      )}
    </>
  )
}
