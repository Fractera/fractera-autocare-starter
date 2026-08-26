"use client"

// ВИДЖЕТ «настройка каналов связи» — источники ответа и инструкция (шаг 32).

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Save, Loader2, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { H4, Small } from "@/components/ui/typography"
import { Sources, type Health } from "./sources.client"
import { Instruction } from "./instruction.client"
import { Knowledge } from "./knowledge.client"
import type { KnowledgeUi } from "./knowledge.i18n"
import type { ChannelSettingsUi } from "./ui.i18n"
import { TestBlock } from "../../../../company/_widgets/dynamic/company-form/test-block.client"
import type { TestBlockUi } from "../../../../company/_widgets/dynamic/company-form/test-block.i18n"

export function ChannelSettings({ ui, testUi, knowledgeUi, lang }: { ui: ChannelSettingsUi; testUi: TestBlockUi; knowledgeUi: KnowledgeUi; lang: string }) {
  const [sources, setSources] = useState<Record<string, boolean>>({})
  const [health, setHealth] = useState<Health[]>([])
  const [instruction, setInstruction] = useState("")
  const [testWa, setTestWa] = useState("")
  const [testTg, setTestTg] = useState("")
  const [saved, setSaved] = useState({ sources: {} as Record<string, boolean>, instruction: "", testWhatsapp: "", testTelegram: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/company/channels", { cache: "no-store" })
        const d = r.ok ? await r.json() : null
        if (d?.settings) {
          setSources(d.settings.sources ?? {})
          setInstruction(d.settings.instruction ?? "")
          setTestWa(d.settings.testWhatsapp ?? "")
          setTestTg(d.settings.testTelegram ?? "")
          setSaved({ sources: d.settings.sources ?? {}, instruction: d.settings.instruction ?? "", testWhatsapp: d.settings.testWhatsapp ?? "", testTelegram: d.settings.testTelegram ?? "" })
        }
        setHealth(Array.isArray(d?.health) ? d.health : [])
      } catch {
        // Молчим: экран покажет пустые переключатели, отказ придёт при сохранении.
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const dirty =
    instruction !== saved.instruction || testWa !== saved.testWhatsapp || testTg !== saved.testTelegram ||
    Object.keys({ ...sources, ...saved.sources }).some(k => Boolean(sources[k]) !== Boolean(saved.sources[k]))

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch("/api/company/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, instruction, testWhatsapp: testWa, testTelegram: testTg }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.ok) { toast.error(ui.failed); return }
      // 🔒 СОСТОЯНИЕ БЕРЁТСЯ ИЗ ОТВЕТА ДВЕРИ, а не из черновика: дверь обрезает и сводит
      // значения, и «сохранённое» на экране обязано совпадать с тем, что легло в файл.
      setSaved({ sources: d.settings.sources, instruction: d.settings.instruction, testWhatsapp: d.settings.testWhatsapp, testTelegram: d.settings.testTelegram })
      setSources(d.settings.sources)
      setInstruction(d.settings.instruction)
      setTestWa(d.settings.testWhatsapp)
      setTestTg(d.settings.testTelegram)
      toast.success(ui.saved)
    } catch {
      toast.error(ui.failed)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <>
      <section>
        <H4 variant="ui" className="flex items-center gap-2">
          <Radar className="size-4 text-muted-foreground" />{ui.sourcesTitle}
        </H4>
        <Small className="mt-1 block max-w-2xl text-muted-foreground">{ui.sourcesSubtitle}</Small>
        <Sources
          ui={ui}
          sources={sources}
          health={health}
          disabled={saving}
          onToggle={(n, on) => setSources(s => ({ ...s, [n]: on }))}
        />
      </section>

      <TestBlock
        ui={testUi}
        whatsapp={testWa}
        telegram={testTg}
        disabled={saving}
        onChange={(f, v) => (f === "testWhatsapp" ? setTestWa(v) : setTestTg(v))}
      />

      <section className="mt-10 border-t border-border pt-8">
        <H4 variant="ui">{ui.instructionTitle}</H4>
        <Instruction ui={ui} lang={lang} value={instruction} disabled={saving} onChange={setInstruction} />
      </section>

      <Knowledge ui={knowledgeUi} />

      <Button type="button" className="mt-6 gap-2" disabled={saving || !dirty} onClick={() => void save()}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {saving ? ui.saving : ui.save}
      </Button>
    </>
  )
}
