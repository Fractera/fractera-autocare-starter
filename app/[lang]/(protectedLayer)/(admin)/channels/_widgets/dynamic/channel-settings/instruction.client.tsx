"use client"

// ИНСТРУКЦИЯ ДЛЯ ОТВЕТА: текст, голосовой набор, улучшение моделью (шаг 32).
//
// 🔒 ГОЛОС — ГОТОВЫЙ ИНСТРУМЕНТ `_tools/voice-input`, тот же, что в чате. У него уже есть
// запись, полоски громкости, счётчик секунд, честный отказ микрофона и дверь расшифровки.
// Второй способ записывать голос означал бы две разные обработки одних и тех же отказов.
//
// 🔒 УЛУЧШЕННОЕ НЕ ЗАМЕЩАЕТ НАДИКТОВАННОЕ МОЛЧА. Показываются оба, человек выбирает.
// Модель иногда «причёсывает» до потери смысла, а это инструкция, по которой продукт будет
// говорить с пациентами: подменить её без спроса значит подменить их разговор.

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Sparkles, Loader2, Check, Undo2 } from "lucide-react"
import VoiceInput from "@/_tools/voice-input/client/voice-input.client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Small } from "@/components/ui/typography"
import type { ChannelSettingsUi } from "./ui.i18n"

export function Instruction(
  { ui, lang, value, disabled, onChange }: {
    ui: ChannelSettingsUi
    lang: string
    value: string
    disabled: boolean
    onChange: (next: string) => void
  },
) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [improved, setImproved] = useState<string | null>(null)

  const improve = async () => {
    if (!value.trim()) { toast.error(ui.emptyText); return }
    setBusy(true)
    try {
      const r = await fetch("/api/company/improve-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.ok) {
        toast.error(d?.error === "no-key" ? ui.noKey : d?.error === "empty" ? ui.emptyText : ui.failed)
        return
      }
      setImproved(d.improved)
    } catch {
      toast.error(ui.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="relative">
        <Textarea
          ref={areaRef}
          value={value}
          placeholder={ui.instructionPlaceholder}
          disabled={disabled || busy}
          rows={8}
          onChange={e => onChange(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* 🔒 АДРЕС ДВЕРИ РАСШИФРОВКИ ЗАДАН ЯВНО. Инструмент по умолчанию берёт СОСЕДА
            текущего пути: с этой страницы вышло бы `/ru/channels/api/transcribe` — двери,
            которой нет. Ловушка названа в самом инструменте и уже стоила отладки. */}
        <VoiceInput
          targetRef={areaRef}
          value={value}
          onChange={onChange}
          lang={lang}
          disabled={disabled || busy}
          apiUrl="/api/transcribe"
        />

        <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => void improve()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {busy ? ui.improving : ui.improve}
        </Button>
      </div>

      {improved !== null && (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">{ui.improvedTitle}</p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{improved}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => { onChange(improved); setImproved(null) }}
            >
              <Check className="size-3.5" />{ui.useImproved}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setImproved(null)}>
              <Undo2 className="size-3.5" />{ui.keepOriginal}
            </Button>
          </div>
        </div>
      )}

      <Small className="text-muted-foreground">{ui.instructionSubtitle}</Small>
    </div>
  )
}
