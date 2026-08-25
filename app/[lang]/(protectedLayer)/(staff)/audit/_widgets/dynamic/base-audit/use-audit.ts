"use client"

// Выборка аудита — СВОЯ, как у соседних виджетов.
//
// 🔒 ОДИН ЗАПРОС НА ОБА ИСТОЧНИКА. Числа базы и числа прогона обязаны быть с
// одного момента: сверка «CRM отдала 1849, у нас 1844» теряет смысл, если левая
// часть посчитана до синхронизации, а правая после.

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import type { BaseAuditUi } from "./ui.i18n"

export type AuditBase = {
  people: number
  visitRows: number
  crmRecords: number
  visitsWithoutPerson: number
  withoutConsent: number
  neverVisited: number
  visitsWithoutService: number
  withoutBirthday: number
}

export type AuditSync = {
  at: string
  actor: string
  clients: number
  peopleInserted: number
  peopleUpdated: number
  visitRows: number
  skippedNoPhone: number
  mergedByPhone: number
  consentKnown: number
  birthdayKnown: number
  /** У скольких карточек ключ был. Отличает «пусто у всех» от «не спрашивали». */
  birthdayFieldSeen: number
  consentFieldSeen: number
}

export type AuditConsent = {
  at: string
  actor: string
  checked: number
  unreadable: number
  withAgreement: number
  refused: number
  allowed: number
  noRecord: number
  changed: number
  seconds: number
}

type State =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; base: AuditBase; sync: AuditSync | null; consent: AuditConsent | null }

export function useAudit(ui: BaseAuditUi) {
  const [state, setState] = useState<State>({ kind: "loading" })

  const load = useCallback(async () => {
    setState({ kind: "loading" })
    try {
      const res = await fetch("/api/care/audit", { cache: "no-store" })
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
        base: data.base as AuditBase,
        sync: (data.sync ?? null) as AuditSync | null,
        consent: (data.consent ?? null) as AuditConsent | null,
      })
    } catch {
      toast.error(ui.unreachable)
      setState({ kind: "failed" })
    }
  }, [ui])

  useEffect(() => {
    void load()
  }, [load])

  return state
}
