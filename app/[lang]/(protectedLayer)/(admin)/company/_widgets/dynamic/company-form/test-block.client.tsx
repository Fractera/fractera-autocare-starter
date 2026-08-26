"use client"

// БЛОК «МЕССЕНДЖЕРЫ ДЛЯ ТЕСТОВЫХ СООБЩЕНИЙ» (шаг 30, заказ Ромы 2026-08-25).
//
// 🔒 НОМЕРА ЛЕЖАТ В ОБЩЕЙ ФОРМЕ КОМПАНИИ, А КНОПКА СОЗДАНИЯ — ЗДЕСЬ. Разделение не
// формальное: номер — настройка, он сохраняется вместе с телефоном и названием; создание
// клиента — ДЕЙСТВИЕ, оно пишет строки в общую базу и должно требовать отдельного нажатия.
// Смешай их — и сохранение названия компании однажды создаст тестового человека.

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { MessageCircle, Send, UserPlus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { H4, Small } from "@/components/ui/typography"
import type { TestBlockUi } from "./test-block.i18n"

export function TestBlock(
  { ui, whatsapp, telegram, disabled, onChange }: {
    ui: TestBlockUi
    whatsapp: string
    telegram: string
    disabled: boolean
    onChange: (field: "testWhatsapp" | "testTelegram", value: string) => void
  },
) {
  const [busy, setBusy] = useState(false)
  const [existing, setExisting] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/company/test-client", { cache: "no-store" })
        const d = r.ok ? await r.json() : null
        setExisting(d?.phone ?? null)
      } catch {
        // Молчим: блок покажет кнопку, отказ придёт при нажатии — с причиной.
      }
    })()
  }, [])

  const create = async () => {
    // 🔒 БЕРЁМ WhatsApp, А ЕСЛИ ЕГО НЕТ — Telegram. Клиент один, номер у него один: это
    // карточка человека, а не канал. Какой канал живой — решает сам ChatPush.
    const phone = whatsapp.trim() || telegram.trim()
    if (!phone) { toast.error(ui.errNoPhone); return }
    setBusy(true)
    try {
      const r = await fetch("/api/company/test-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.ok) {
        const map: Record<string, string> = { "no-phone": ui.errNoPhone, exists: ui.errExists, "no-source": ui.errNoSource }
        toast.error(map[String(d?.error)] ?? ui.failed)
        return
      }
      setExisting(d.phone)
      toast.success(`${ui.created}: ${d.name}`, { description: `${d.visits} визитов, скопировано у: ${d.copiedFrom}` })
    } catch {
      toast.error(ui.failed)
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      const r = await fetch("/api/company/test-client", { method: "DELETE" })
      if (!r.ok) { toast.error(ui.failed); return }
      setExisting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <H4 variant="ui" className="flex items-center gap-2">
        <MessageCircle className="size-4 text-muted-foreground" />{ui.title}
      </H4>
      <Small className="mt-1 block text-muted-foreground">{ui.subtitle}</Small>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-whatsapp">{ui.whatsappLabel}</Label>
          <Input
            id="test-whatsapp"
            value={whatsapp}
            placeholder="+7 900 000-00-00"
            disabled={disabled}
            onChange={e => onChange("testWhatsapp", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-telegram">{ui.telegramLabel}</Label>
          <Input
            id="test-telegram"
            value={telegram}
            placeholder="+7 900 000-00-00"
            disabled={disabled}
            onChange={e => onChange("testTelegram", e.target.value)}
          />
        </div>
      </div>
      <Small className="mt-2 block text-muted-foreground">{ui.numberHint}</Small>

      <div className="mt-6 border-t border-border pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{ui.createTitle}</span>
          {existing && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
              {ui.exists} · {existing}
            </Badge>
          )}
        </div>
        <Small className="mt-1 block max-w-2xl text-muted-foreground">{ui.createHint}</Small>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy || disabled} onClick={() => void create()}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
            {busy ? ui.creating : ui.create}
          </Button>
          {existing && (
            <Button type="button" variant="ghost" size="sm" disabled={busy || disabled} onClick={() => void clear()}>
              <Trash2 className="size-3.5" />{ui.remove}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
