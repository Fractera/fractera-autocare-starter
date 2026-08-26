"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { uploadFile } from "@/services/upload/upload.service"
import type { CompanyFormUi } from "./ui.i18n"

export type Settings = { name: string; shortName: string; phone: string; logo: string; favicon: string; testWhatsapp: string; testTelegram: string }

const EMPTY: Settings = { name: "", shortName: "", phone: "", logo: "", favicon: "", testWhatsapp: "", testTelegram: "" }

// 🔒 ФОРМА ДЕРЖИТ ДВА СОСТОЯНИЯ: что человек набрал (`draft`) и что лежит на сервере
// (`saved`). Одного мало: без второго нельзя ни ответить на вопрос «есть несохранённые
// правки», ни вернуть как было, а обе вещи для формы настроек обязательны — человек
// правит название компании раз в год и должен видеть, тронул он его или нет.
export function useCompany(ui: CompanyFormUi) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Settings>(EMPTY)
  const [draft, setDraft] = useState<Settings>(EMPTY)
  const [badField, setBadField] = useState<keyof Settings | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/company", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(res.status === 401 || res.status === 403 ? ui.forbidden : ui.failed)
        return
      }
      const s = (data.settings ?? EMPTY) as Settings
      setSaved(s)
      setDraft(s)
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

  const set = useCallback((field: keyof Settings, value: string) => {
    setDraft(d => ({ ...d, [field]: value }))
    setBadField(f => (f === field ? null : f))
  }, [])

  const reset = useCallback(() => {
    setDraft(saved)
    setBadField(null)
  }, [saved])

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true)
    setBadField(null)
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) toast.error(ui.forbidden)
        else if (res.status === 400) {
          // Дверь называет ПОЛЕ — подсвечиваем именно его, а не всю форму.
          const field = data.field as keyof Settings | undefined
          if (field) setBadField(field)
          const map: Record<string, string> = { empty: ui.errEmpty, tooLong: ui.errTooLong, badPhone: ui.errBadPhone }
          toast.error(map[String(data.error)] ?? ui.failed)
        } else toast.error(ui.failed)
        return false
      }
      // 🔒 СОСТОЯНИЕ БЕРЁТСЯ ИЗ ОТВЕТА ДВЕРИ, А НЕ ИЗ ЧЕРНОВИКА. Дверь обрезает
      // пробелы по краям, и черновик после сохранения отличался бы от того, что
      // действительно легло в файл, — на глаз незаметно, а «вернуть как было» вернуло
      // бы не то.
      const s = (data.settings ?? draft) as Settings
      setSaved(s)
      setDraft(s)
      toast.success(ui.saved)
      return true
    } catch {
      toast.error(ui.unreachable)
      return false
    } finally {
      setSaving(false)
    }
  }, [draft, ui])

  // 🔒 КАРТИНКА ЗАГРУЖАЕТСЯ СРАЗУ, А СОХРАНЯЕТСЯ ПО КНОПКЕ. Файл уезжает в медиахранилище
  // в момент выбора — иначе его пришлось бы держать в памяти страницы до сохранения, и
  // человек, закрывший вкладку, терял бы загруженное молча. В настройки же попадает
  // только АДРЕС, и попадает он общим сохранением: пока не нажата кнопка, сайт живёт со
  // старым логотипом, и это видно по надписи «есть несохранённые правки».
  const [uploading, setUploading] = useState<keyof Settings | null>(null)
  const upload = useCallback(async (field: "logo" | "favicon", file: File) => {
    setUploading(field)
    try {
      const stored = await uploadFile(file)
      setDraft(d => ({ ...d, [field]: stored.url }))
    } catch {
      toast.error(ui.uploadFailed)
    } finally {
      setUploading(null)
    }
  }, [ui])

  const dirty = draft.name !== saved.name || draft.shortName !== saved.shortName || draft.phone !== saved.phone || draft.logo !== saved.logo || draft.favicon !== saved.favicon || draft.testWhatsapp !== saved.testWhatsapp || draft.testTelegram !== saved.testTelegram

  return { loading, saving, draft, dirty, badField, set, save, reset, upload, uploading }
}
