"use client"

// БЛОК КЛЮЧЕЙ ИНТЕГРАЦИЙ на экране настроек компании (шаг 29, заказ Ромы 2026-08-25).
//
// 🔒 ОТДЕЛЬНЫЙ ОСТРОВОК, А НЕ ПОЛЯ В ОБЩЕЙ ФОРМЕ. У названия компании и у ключа OpenAI
// разная цена ошибки: первое видно всем и правится обратно, второй открывает доступ к
// чужому счёту. Разные формы — разные кнопки «Сохранить», и телефон нельзя сохранить
// вместе с ключом по случайности.

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { KeyRound, Save, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { H4, Small } from "@/components/ui/typography"
import type { KeysUi } from "./keys.i18n"

type KeyState = { name: string; set: boolean; source: "file" | "env" | "none"; tail: string | null }

export function KeysBlock({ ui }: { ui: KeysUi }) {
  const [keys, setKeys] = useState<KeyState[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const r = await fetch("/api/company/keys", { cache: "no-store" })
      const d = r.ok ? await r.json() : null
      setKeys(Array.isArray(d?.keys) ? d.keys : [])
    } catch {
      // Молчим: блок просто не покажет состояний, а форма настроек выше работает.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const send = async (patch: Record<string, string | null>) => {
    setBusy(true)
    try {
      const r = await fetch("/api/company/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { toast.error(ui.failed); return }
      setKeys(Array.isArray(d?.keys) ? d.keys : [])
      // 🔒 ЧЕРНОВИК ОЧИЩАЕТСЯ ПОСЛЕ УСПЕХА. Оставленный ключ в поле — это ключ на экране,
      // который увидит следующий, кто подойдёт к этому компьютеру.
      setDraft({})
      toast.success(ui.saved)
    } catch {
      toast.error(ui.failed)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  return (
    <section className="mt-10 border-t border-border pt-8">
      <H4 variant="ui" className="flex items-center gap-2">
        <KeyRound className="size-4 text-muted-foreground" />{ui.title}
      </H4>
      <Small className="mt-1 block text-muted-foreground">{ui.subtitle}</Small>

      {/* 🔒 ПРАВИЛО «ПУСТОЕ = НЕ МЕНЯТЬ» НАПИСАНО НА ЭКРАНЕ, А НЕ ТОЛЬКО В КОДЕ. Иначе
          администратор, увидев пустые поля, решит, что ключей нет, и введёт их заново. */}
      <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        {ui.hidden}
      </p>

      <div className="mt-5 flex flex-col gap-5">
        {keys.map(k => {
          const meta = ui.labels[k.name] ?? { label: k.name, what: "" }
          return (
            <div key={k.name} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor={`key-${k.name}`}>{meta.label}</Label>
                {k.set ? (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                    {k.source === "env" ? ui.fromEnv : ui.set}
                    {k.tail ? ` · …${k.tail}` : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                    {ui.notSet}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  id={`key-${k.name}`}
                  type="password"
                  autoComplete="off"
                  placeholder={ui.placeholder}
                  value={draft[k.name] ?? ""}
                  disabled={busy}
                  className="max-w-md"
                  onChange={e => setDraft(d => ({ ...d, [k.name]: e.target.value }))}
                />
                {k.set && k.source === "file" && (
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void send({ [k.name]: null })}>
                    <Trash2 className="size-3.5" />{ui.clear}
                  </Button>
                )}
              </div>

              <Small className="text-muted-foreground">{meta.what}</Small>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        className="mt-6 gap-2"
        disabled={busy || Object.values(draft).every(v => !v?.trim())}
        onClick={() => void send(Object.fromEntries(Object.entries(draft).filter(([, v]) => v?.trim())))}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {busy ? ui.saving : ui.save}
      </Button>
    </section>
  )
}
