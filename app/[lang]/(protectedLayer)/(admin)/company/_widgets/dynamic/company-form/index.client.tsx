"use client"

// ВИДЖЕТ «данные компании» — единица владения: выборка, поля, слова, скелетон.
// Снеси папку маршрута — виджет исчезнет целиком.

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Small } from "@/components/ui/typography"
import { Save, Undo2, Info } from "lucide-react"
import { useCompany, type Settings } from "./use-company"
import { ImageField } from "./image-field.client"
import { CompanyFormSkeleton } from "./skeleton"
import type { CompanyFormUi } from "./ui.i18n"

function Field({
  id, label, hint, value, placeholder, invalid, disabled, onChange,
}: {
  id: string
  label: string
  hint: string
  value: string
  placeholder?: string
  invalid: boolean
  disabled: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-hint`}
        className="max-w-md"
        onChange={e => onChange(e.target.value)}
      />
      <Small id={`${id}-hint`} className="text-muted-foreground">{hint}</Small>
    </div>
  )
}

export function CompanyForm({ ui }: { ui: CompanyFormUi }) {
  const { loading, saving, draft, dirty, badField, set, save, reset, upload, uploading } = useCompany(ui)

  if (loading) return <CompanyFormSkeleton />

  const field = (name: keyof Settings) => ({
    value: draft[name],
    invalid: badField === name,
    disabled: saving,
    onChange: (v: string) => set(name, v),
  })

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={e => { e.preventDefault(); void save() }}
    >
      <Field id="company-name" label={ui.nameLabel} hint={ui.nameHint} {...field("name")} />
      <Field id="company-short" label={ui.shortLabel} hint={ui.shortHint} {...field("shortName")} />
      <Field
        id="company-phone"
        label={ui.phoneLabel}
        hint={ui.phoneHint}
        placeholder={ui.phonePlaceholder}
        {...field("phone")}
      />

      <ImageField
        id="company-logo"
        label={ui.logoLabel}
        hint={ui.logoHint}
        value={draft.logo}
        busy={uploading === "logo"}
        disabled={saving}
        uploadLabel={ui.upload}
        busyLabel={ui.uploading}
        removeLabel={ui.remove}
        onPick={(f) => void upload("logo", f)}
        onClear={() => set("logo", "")}
      />

      <ImageField
        id="company-favicon"
        label={ui.faviconLabel}
        hint={ui.faviconHint}
        value={draft.favicon || draft.logo}
        busy={uploading === "favicon"}
        disabled={saving}
        uploadLabel={ui.upload}
        busyLabel={ui.uploading}
        removeLabel={ui.remove}
        onPick={(f) => void upload("favicon", f)}
        onClear={() => set("favicon", "")}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving || !dirty}>
          <Save />
          {saving ? ui.saving : ui.save}
        </Button>
        {dirty && (
          <Button type="button" variant="ghost" onClick={reset} disabled={saving}>
            <Undo2 />
            {ui.reset}
          </Button>
        )}
      </div>

      {/* 🔒 ВТОРОЙ ПИСАТЕЛЬ НАЗВАН НА ЭКРАНЕ, А НЕ СПРЯТАН В КОММЕНТАРИЙ. Те же поля
          правятся в панели управления, и наша дверь об этом не знает. Человек, у
          которого настройка «сама вернулась», объявит поломкой то, что является
          принятой ценой решения владельца, — если ему об этом не сказали заранее. */}
      <p className="flex max-w-md items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {ui.panelWarning}
      </p>
    </form>
  )
}
