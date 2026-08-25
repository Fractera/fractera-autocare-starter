"use client"

// Поведение очереди задач — своё, как у соседних виджетов.
//
// 🔒 ОТКРЫТА СРАЗУ: адрес называется «Задачи», и очередь — вся страница. Тот же
// довод, что у списка людей.

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import type { TasksQueueUi } from "./ui.i18n"

export type TaskRow = {
  id: string
  person_id: string
  scenario_id: string | null
  assignee: string | null
  status: string
  due_date: string
  result_comment: string | null
  full_name: string
  phone: string
  consent_to_contact: number
  scenario_title: string | null
}

export type Counts = { today: number; open: number; done: number; all: number }
export type Scope = "today" | "open" | "done" | "all"

const SIZE_KEY = "fractera-tasks-per-page"
export const PAGE_SIZES = [20, 40, 60]

export function useTasksQueue(ui: TasksQueueUi) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<TaskRow[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Counts>({ today: 0, open: 0, done: 0, all: 0 })
  const [scope, setScope] = useState<Scope>("today")
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [perPage, setPerPage] = useState(20)

  const load = useCallback(
    async (opts: { scope?: Scope; page?: number; perPage?: number } = {}) => {
      const nextScope = opts.scope ?? scope
      const nextPage = opts.page ?? 1
      const size = opts.perPage ?? perPage
      setLoading(true)
      try {
        const params = new URLSearchParams({ scope: nextScope, page: String(nextPage), perPage: String(size) })
        const res = await fetch(`/api/care/tasks?${params}`, { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(
            res.status === 401 || res.status === 403 ? ui.forbidden
            : res.status === 502 ? ui.unreachable : ui.failed,
          )
          return
        }
        const list = Array.isArray(data.tasks) ? (data.tasks as TaskRow[]) : []
        setRows(list)
        setTotal(Number(data.total) || 0)
        setCounts(data.counts as Counts)
        setScope(nextScope)
        setPage(nextPage)
        const used = Number(data.perPage) || size
        setPerPage(used)
        setPages(Math.max(1, Math.ceil((Number(data.total) || 0) / used)))
      } catch {
        toast.error(ui.unreachable)
      } finally {
        setLoading(false)
      }
    },
    [ui, scope, perPage],
  )

  // Первое чтение — один раз, с запомненным размером страницы.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const saved = Number(localStorage.getItem(SIZE_KEY))
    const size = PAGE_SIZES.includes(saved) ? saved : 20
    setPerPage(size)
    void load({ scope: "today", page: 1, perPage: size })
  }, [load])

  const changeSize = useCallback(
    (size: number) => {
      setPerPage(size)
      localStorage.setItem(SIZE_KEY, String(size))
      void load({ page: 1, perPage: size })
    },
    [load],
  )

  return { loading, rows, total, counts, scope, page, pages, perPage, load, changeSize }
}
