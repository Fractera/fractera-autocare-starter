"use client"

// Выборка карточки — СВОЯ, как у соседних виджетов.
//
// 🔒 ОДИН ЗАПРОС НА ВСЮ КАРТОЧКУ, А НЕ ТРИ. Человек, дело и визиты приезжают
// вместе: три отдельных запроса дали бы три момента времени на одном экране —
// итог посчитан до последнего визита, история после, — и объяснить расхождение
// было бы нечем.
//
// 🔒 «НЕ НАЙДЕН» — ОТДЕЛЬНОЕ СОСТОЯНИЕ, А НЕ ОШИБКА. Открытая по старой ссылке
// карточка и упавший слой данных требуют разных слов и разных действий.

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import type { PersonCardUi } from "./ui.i18n"

export type Person = {
  id: string
  full_name: string
  phone: string
  email: string | null
  birth_date: string | null
  consent_to_contact: number
  comment: string | null
}

export type CareSummary = {
  yclients_client_id: string | null
  service_direction: string | null
  doctor_name: string | null
  last_service: string | null
  next_visit_date: string | null
  visits_success_count: number | null
  visits_fail_count: number | null
  is_new_client: number | null
  /** Число ЗАПИСЕЙ CRM, а не строк услуг. */
  visits: number
  ltv: number
  last_visit: string | null
  has_future: number
  has_open_task: number
}

export type Visit = {
  id: string
  yclients_record_id: string
  visit_date: string
  attendance: number | null
  staff_name: string | null
  service_title: string | null
  service_cost: number | null
}

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "failed" }
  | { kind: "ready"; person: Person; care: CareSummary; visits: Visit[] }

export function usePerson(id: string, ui: PersonCardUi) {
  const [state, setState] = useState<State>({ kind: "loading" })

  const load = useCallback(async () => {
    setState({ kind: "loading" })
    try {
      const res = await fetch(`/api/care/person/${encodeURIComponent(id)}`, { cache: "no-store" })
      if (res.status === 404) {
        setState({ kind: "missing" })
        return
      }
      if (!res.ok) {
        toast.error(
          res.status === 401 || res.status === 403
            ? ui.forbidden
            : res.status === 502
              ? ui.unreachable
              : ui.failed,
        )
        setState({ kind: "failed" })
        return
      }
      const data = await res.json()
      setState({
        kind: "ready",
        person: data.person as Person,
        care: data.care as CareSummary,
        visits: Array.isArray(data.visits) ? (data.visits as Visit[]) : [],
      })
    } catch {
      toast.error(ui.unreachable)
      setState({ kind: "failed" })
    }
  }, [id, ui])

  useEffect(() => {
    void load()
  }, [load])

  return state
}
