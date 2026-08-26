"use client"

// БАЗА ЗНАНИЙ КОМПАНИИ — загрузка документов в граф (шаг 33, заказ Ромы 2026-08-25).
//
// 🔒 ЦЕНА НАЗВАНА ДО ЗАПУСКА, А НЕ ПОСЛЕ. `learn` заставляет модель прочитать КАЖДЫЙ кусок
// документа — это главная статья расхода всей возможности. Навык проекта говорит прямо:
// «когда владелец просит загрузить весь архив, это тот момент, чтобы назвать цену вслух —
// до запуска, а не в счёте».
//
// 🔒 «ПРИНЯТО» НЕ ЗНАЧИТ «ГОТОВО». Граф строится в фоне; вопрос через секунду честно
// ответит «ничего не найдено». Экран показывает СОСТОЯНИЕ, иначе администратор решит, что
// загрузка не удалась, и загрузит то же самое второй раз — за те же деньги.

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { BookOpen, Upload, Trash2, Loader2, CircleAlert, CircleCheck, CircleDashed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { H4, Small } from "@/components/ui/typography"
import type { KnowledgeUi } from "./knowledge.i18n"

type Doc = { id: string; status: string; source: string | null; chunks: number }

export function Knowledge({ ui }: { ui: KnowledgeUi }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [ready, setReady] = useState(true)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const load = async () => {
    try {
      const r = await fetch("/api/company/knowledge", { cache: "no-store" })
      const d = r.ok ? await r.json() : null
      setDocs(Array.isArray(d?.documents) ? d.documents : [])
      setReady(Boolean(d?.ready))
    } catch {
      setReady(false)
    }
  }

  useEffect(() => { void load() }, [])

  const upload = async (files: FileList) => {
    setBusy(true)
    let ok = 0
    try {
      // 🔒 ФАЙЛЫ ИДУТ ПО ОДНОМУ, А НЕ ПАЧКОЙ. Каждый — свой документ со своим именем в графе
      // (`source`), и отказ на третьем не должен отменять первые два: за них уже заплачено
      // чтением модели.
      for (const file of Array.from(files)) {
        const text = await file.text()
        const r = await fetch("/api/company/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, text }),
        })
        const d = await r.json().catch(() => ({}))
        if (!r.ok || !d?.ok) {
          const map: Record<string, string> = { badType: ui.errBadType, empty: ui.errEmpty, refused: ui.errRefused }
          toast.error(`${file.name}: ${map[String(d?.error)] ?? ui.errRefused}`)
          continue
        }
        ok++
      }
      if (ok) toast.success(`${ui.accepted}: ${ok}`, { description: ui.acceptedHint })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setRemoving(id)
    try {
      const r = await fetch(`/api/company/knowledge?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.ok) { toast.error(ui.errRefused); return }
      // 🔒 СПИСОК ПЕРЕЧИТЫВАЕТСЯ, А НЕ ПРАВИТСЯ НА ЭКРАНЕ: удаление у движка асинхронно, и
      // его `200` означает «начато». Убери строку сами — она вернётся при перезагрузке.
      setDocs(Array.isArray(d?.documents) ? d.documents : [])
      await load()
    } finally {
      setRemoving(null)
    }
  }

  const mark = (s: string) => {
    if (s === "processed") return { icon: <CircleCheck className="size-3.5 text-primary" />, text: ui.inGraph }
    if (s === "failed") return { icon: <CircleAlert className="size-3.5 text-destructive" />, text: ui.failed }
    return { icon: <CircleDashed className="size-3.5 animate-pulse text-muted-foreground" />, text: ui.building }
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <H4 variant="ui" className="flex items-center gap-2">
        <BookOpen className="size-4 text-muted-foreground" />{ui.title}
      </H4>
      <Small className="mt-1 block max-w-2xl text-muted-foreground">{ui.subtitle}</Small>

      {!ready && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          {ui.engineDown}
        </p>
      )}

      {/* 🔒 ПРЕДУПРЕЖДЕНИЕ О ЦЕНЕ СТОИТ НАД КНОПКОЙ, А НЕ ПОД НЕЙ. Прочитанное после нажатия
          не предупреждение, а оправдание. */}
      <p className="mt-3 max-w-2xl rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground">
        {ui.costWarning}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.markdown,text/plain,text/markdown"
        multiple
        className="hidden"
        onChange={e => {
          const f = e.target.files
          if (f?.length) void upload(f)
          e.target.value = ""
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy || !ready} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {busy ? ui.adding : ui.add}
        </Button>
      </div>
      <Small className="mt-2 block max-w-2xl text-muted-foreground">{ui.formatHint}</Small>

      <div className="mt-4">
        {docs.length === 0 ? (
          <p className="text-xs text-muted-foreground">{ui.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {docs.map(d => {
              const m = mark(d.status)
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-xs">
                  {m.icon}
                  <span className="min-w-0 flex-1 truncate text-foreground">{d.source ?? d.id}</span>
                  <span className="text-[10px] text-muted-foreground">{m.text}</span>
                  {d.chunks > 0 && <span className="text-[10px] tabular-nums text-muted-foreground">{d.chunks} кусков</span>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removing === d.id}
                    onClick={() => void remove(d.id)}
                  >
                    {removing === d.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                    {removing === d.id ? ui.removing : ui.remove}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
