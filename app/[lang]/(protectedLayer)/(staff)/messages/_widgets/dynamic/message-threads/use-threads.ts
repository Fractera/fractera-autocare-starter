"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import type { MessageThreadsUi } from "./ui.i18n"

export type Thread = {
  phone: string
  total: number
  incoming: number
  last_at: string
  last_text: string | null
  last_direction: "incoming" | "outgoing"
  channel: string
  person_id: string | null
  full_name: string | null
  consent_to_contact: number | null
}

export type Message = {
  id: string
  phone: string
  person_id: string | null
  direction: "incoming" | "outgoing"
  text: string | null
  channel: string
  ai_generated: number
  status: string
  created_at: string
}

export type Summary = { threads: number; messages: number; unknownNumbers: number; aiReplies: number }

export function useThreads(ui: MessageThreadsUi) {
  const [loading, setLoading] = useState(true)
  const [threads, setThreads] = useState<Thread[]>([])
  const [summary, setSummary] = useState<Summary>({ threads: 0, messages: 0, unknownNumbers: 0, aiReplies: 0 })
  /** Открытая ветка. `null` — показан список. */
  const [openPhone, setOpenPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const say = useCallback((s: number) => {
    toast.error(s === 401 || s === 403 ? ui.forbidden : s === 502 ? ui.unreachable : ui.failed)
  }, [ui])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/care/messages", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { say(res.status); return }
      setThreads(Array.isArray(data.threads) ? data.threads : [])
      setSummary(data.summary as Summary)
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

  const open = useCallback(async (phone: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/care/messages?phone=${encodeURIComponent(phone)}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { say(res.status); return }
      setMessages(Array.isArray(data.messages) ? data.messages : [])
      setOpenPhone(phone)
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setLoading(false)
    }
  }, [ui, say])

  const close = useCallback(() => { setOpenPhone(null); setMessages([]) }, [])

  return { loading, threads, summary, openPhone, messages, open, close }
}
