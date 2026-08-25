"use client"

// Поведение экрана правил — своё, как у соседних виджетов.

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import type { ScenarioRulesUi } from "./ui.i18n"

export type Rule = {
  id: string
  title: string
  description: string | null
  trigger_type: string
  days_offset: number
  service_direction: string | null
  message_goal: string
  is_active: number
  tasks_total: number
  tasks_booked: number
  tasks_open: number
}

export type RunResult = {
  candidates: number
  created: number
  skipped: { noConsent: number; hasOpenTask: number; recentlyContacted: number; unknownPerson: number }
}

export function useRules(ui: ScenarioRulesUi) {
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<Rule[]>([])
  const [dead, setDead] = useState<string[]>([])
  const [triggers, setTriggers] = useState<string[]>([])
  /** Сколько подходит под правило — считается по требованию, не при загрузке. */
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const say = useCallback((status: number) => {
    toast.error(status === 401 || status === 403 ? ui.forbidden : status === 502 ? ui.unreachable : ui.failed)
  }, [ui])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/care/scenarios", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { say(res.status); return }
      setRules(Array.isArray(data.scenarios) ? data.scenarios : [])
      setDead(Array.isArray(data.triggersWithoutData) ? data.triggersWithoutData : [])
      setTriggers(Array.isArray(data.triggers) ? data.triggers : [])
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setLoading(false)
    }
  }, [ui, say])

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void load()
  }, [load])

  /** Посчитать, сколько людей подходит. Ничего не меняет. */
  const count = useCallback(async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/care/scenarios/${id}/run`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { say(res.status); return }
      setCounts(c => ({ ...c, [id]: Number(data.candidates) || 0 }))
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setBusy(null)
    }
  }, [ui, say])

  /** Завести задачи по правилу. Право администратора — отказ приходит как 401/403. */
  const run = useCallback(async (id: string): Promise<RunResult | null> => {
    setBusy(id)
    try {
      const res = await fetch(`/api/care/scenarios/${id}/run`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 409 — не поломка, а состояние: правило выключено или сводится вручную.
        // Его причину показываем как есть, а не общей фразой «не удалось».
        if (res.status === 409) toast.error(String(data.error ?? ui.failed))
        else say(res.status)
        return null
      }
      await load()
      return data as RunResult
    } catch {
      toast.error(ui.unreachable)
      return null
    } finally {
      setBusy(null)
    }
  }, [ui, say, load])

  const toggle = useCallback(async (id: string, isActive: boolean) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/care/scenarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) { say(res.status); return }
      await load()
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setBusy(null)
    }
  }, [ui, say, load])

  const create = useCallback(async (body: unknown): Promise<boolean> => {
    setBusy("new")
    try {
      const res = await fetch("/api/care/scenarios", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Причина названа поимённо дверью — показываем её, а не общее «не вышло».
        toast.error(String(data.error ?? ui.failed))
        return false
      }
      toast.success(ui.saved)
      // Предупреждение о мёртвом триггере приходит вместе с успехом и обязано
      // быть показано: правило создано и не выстрелит.
      if (data.warning) toast.warning(String(data.warning))
      await load()
      return true
    } catch {
      toast.error(ui.unreachable)
      return false
    } finally {
      setBusy(null)
    }
  }, [ui, load])

  return { loading, rules, dead, triggers, counts, busy, count, run, toggle, create }
}
