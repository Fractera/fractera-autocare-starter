"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import type { ServiceCatalogueUi } from "./ui.i18n"

export type Service = {
  id: string
  service_title: string
  category: string | null
  protocol_text: string | null
  is_course: number
  excluded: number
  visits: number
  people: number
  revenue: number
  last_used: string | null
}

export type Summary = {
  total: number
  withProtocol: number
  courses: number
  excluded: number
  uncategorised: number
}

export function useCatalogue(ui: ServiceCatalogueUi) {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, withProtocol: 0, courses: 0, excluded: 0, uncategorised: 0 })
  const [query, setQuery] = useState("")
  const [applied, setApplied] = useState("")
  const [category, setCategory] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async (opts: { q?: string; category?: string } = {}) => {
    const q = opts.q ?? ""
    const cat = opts.category ?? ""
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (cat) params.set("category", cat)
      const res = await fetch(`/api/care/services?${params}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(res.status === 401 || res.status === 403 ? ui.forbidden : res.status === 502 ? ui.unreachable : ui.failed)
        return
      }
      setServices(Array.isArray(data.services) ? data.services : [])
      setCategories(Array.isArray(data.categories) ? data.categories : [])
      setSummary(data.summary as Summary)
      setApplied(q)
      setCategory(cat)
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setLoading(false)
    }
  }, [ui])

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void load()
  }, [load])

  const save = useCallback(async (id: string, patch: unknown): Promise<boolean> => {
    setSaving(id)
    try {
      const res = await fetch(`/api/care/services/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      })
      if (!res.ok) {
        toast.error(res.status === 401 || res.status === 403 ? ui.forbidden : ui.failed)
        return false
      }
      toast.success(ui.saved)
      await load({ q: applied, category })
      return true
    } catch {
      toast.error(ui.unreachable)
      return false
    } finally {
      setSaving(null)
    }
  }, [ui, load, applied, category])

  return {
    loading, services, categories, summary,
    query, setQuery, applied, category, saving, load, save,
  }
}
