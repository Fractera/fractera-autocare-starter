"use client"

// Поведение таблицы людей — СВОЁ, как у соседних виджетов.
//
// 🔒 ОТКРЫТА СРАЗУ, А НЕ ПО КНОПКЕ — И ЭТО ОСОЗНАННОЕ РАСХОЖДЕНИЕ С ОБРАЗЦОМ.
// Таблица учётных записей (`administration/users`) закрыта до нажатия: там
// список людей — самая дорогая выборка страницы, у которой есть и другое
// содержимое. Здесь иначе: адрес называется «Пациенты», и список людей — ВСЯ
// страница. Закон говорит прятать «дорогой запрос, которого никто не просил»;
// открывший этот адрес попросил ровно его. Кнопка «Показать» на странице,
// существующей ради одного списка, — работа вместо ценности.
//
// Скелетон при этом остаётся: до ответа стоит та же таблица без значений.
//
// 🔒 ОТКАЗ РАЗБИРАЕТСЯ ПО КОДУ, А НЕ ОДНОЙ ФРАЗОЙ. 401/403 и 502 — разные
// события: первое означает «вам сюда нельзя», второе — «слой данных не
// ответил». Общее «не удалось» заставило бы искать неисправность там, где её
// нет.

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import type { PatientsTableUi } from "./ui.i18n"

/**
 * Строка списка. Ровно то, что отдаёт дверь, — не больше.
 *
 * 🔒 ВНУТРЕННЕЙ ЗАМЕТКИ ЗДЕСЬ НЕТ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ. `comment` остаётся на
 * сервере: свободный текст, в котором легко окажется то, чему не место в общем
 * списке. Правило шага 10 о разделении человека и дела.
 */
export type PersonRow = {
  id: string
  full_name: string
  phone: string
  consent_to_contact: number
  last_visit: string | null
  next_visit_date: string | null
  visits: number
  ltv: number
  has_future: number
  has_open_task: number
}

// 🔒 КЛЮЧ ХРАНЕНИЯ СВОЙ У КАЖДОЙ ТАБЛИЦЫ. Человек, поставивший шестьдесят строк
// здесь, не должен получить шестьдесят в таблице учётных записей: разные задачи
// и разные привычки.
const SIZE_KEY = "fractera-patients-per-page"

// 🔒 СТУПЕНИ ПОВТОРЯЮТ `PAGE_SIZES` ПРЕДМЕТНОЙ МОДЕЛИ. Дверь принимает закрытый
// набор и молча приводит чужое число к умолчанию; попроси отсюда иное — человек
// увидел бы не тот размер, что выбрал.
export const PAGE_SIZES = [20, 40, 60]

export function usePatientsList(ui: PatientsTableUi) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PersonRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  // Что НАБРАНО и что ПРИМЕНЕНО — разные вещи, иначе список дёргается, пока
  // человек печатает.
  const [query, setQuery] = useState("")
  const [applied, setApplied] = useState("")
  const [perPage, setPerPage] = useState(20)

  const load = useCallback(
    async (opts: { page?: number; q?: string; perPage?: number } = {}) => {
      const nextPage = opts.page ?? 1
      const q = opts.q ?? ""
      const size = opts.perPage ?? perPage
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(nextPage), perPage: String(size) })
        if (q) params.set("q", q)
        const res = await fetch(`/api/care/people?${params}`, { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(
            res.status === 401 || res.status === 403
              ? ui.forbidden
              : res.status === 502
                ? ui.unreachable
                : ui.failed,
          )
          return
        }
        const list = Array.isArray(data.people) ? (data.people as PersonRow[]) : []
        setRows(list)
        setTotal(Number(data.total) || 0)
        setPage(nextPage)
        setApplied(q)
        // Число страниц считает сторона, знающая, СКОЛЬКО СТРОК ОНА ОТДАЛА:
        // дверь подтверждает применённый размер своим ответом, и верить надо
        // ему, а не тому, что мы просили.
        const usedSize = Number(data.perPage) || size
        setPerPage(usedSize)
        setPages(Math.max(1, Math.ceil((Number(data.total) || 0) / usedSize)))
      } catch {
        toast.error(ui.unreachable)
      } finally {
        setLoading(false)
      }
    },
    [ui, perPage],
  )

  // Первое чтение — сразу при появлении виджета. Размер страницы берётся из
  // привычки человека ДО запроса, иначе первый список приедет чужого размера и
  // тут же перечитается вторым запросом.
  //
  // 🔒 РОВНО ОДИН РАЗ. `load` пересоздаётся при смене `perPage`, и зависимость
  // от него здесь превратила бы первое чтение в цикл.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const saved = Number(localStorage.getItem(SIZE_KEY))
    const size = PAGE_SIZES.includes(saved) ? saved : 20
    setPerPage(size)
    void load({ page: 1, perPage: size })
  }, [load])

  /** Сменить размер страницы: запомнить выбор и вернуться к первой странице. */
  const changeSize = useCallback(
    (size: number) => {
      setPerPage(size)
      localStorage.setItem(SIZE_KEY, String(size))
      // С первой страницы, а не с текущей: на новой нарезке «страница пять»
      // означает другое место списка, и человек оказался бы не там, где был.
      void load({ page: 1, q: applied, perPage: size })
    },
    [load, applied],
  )

  const reset = useCallback(() => {
    setQuery("")
    void load({ page: 1, perPage })
  }, [load, perPage])

  return {
    loading, rows, total, page, pages, perPage,
    query, setQuery, applied, load, changeSize, reset,
  }
}
