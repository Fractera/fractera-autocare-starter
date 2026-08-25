"use client"

// Верх карточки: связь слева, итог справа.

import { Badge } from "@/components/ui/badge"
import { H4, Metric, Small } from "@/components/ui/typography"
import { humanDate, money, phone } from "./format"
import type { Person, CareSummary } from "./use-person"
import type { PersonCardUi } from "./ui.i18n"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground">{value}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <Metric className="tabular-nums">{value}</Metric>
      <Small className="text-muted-foreground">{label}</Small>
    </div>
  )
}

export function PersonSummary(
  { person, care, visitRows, ui }: {
    person: Person
    care: CareSummary
    /** Число СТРОК услуг: оно больше числа визитов, когда за приём сделали два дела. */
    visitRows: number
    ui: PersonCardUi
  },
) {
  const last = humanDate(care.last_visit)
  const ahead = humanDate(care.next_visit_date)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-border p-4">
        <H4 variant="ui" className="mb-3">{ui.contacts}</H4>

        {/* 🔒 ЗАПРЕТ НА СВЯЗЬ СТОИТ ПЕРВЫМ И ОБЪЯСНЁН СЛОВАМИ. Этот продукт
            существует, чтобы писать людям: отказ обязан быть виден раньше
            телефона, а не мелким значком под ним. */}
        {person.consent_to_contact ? (
          <Badge variant="secondary" className="mb-3 font-normal">{ui.consentYes}</Badge>
        ) : (
          <div className="mb-3">
            <Badge variant="destructive" className="font-normal">{ui.consentNo}</Badge>
            <p className="mt-1 text-[11px] text-muted-foreground">{ui.consentNoHint}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Field label={ui.phone} value={<span className="tabular-nums">{phone(person.phone)}</span>} />
          {person.email && <Field label={ui.email} value={person.email} />}
          {humanDate(person.birth_date) && (
            <Field label={ui.birthday} value={<span className="tabular-nums">{humanDate(person.birth_date)}</span>} />
          )}
          {care.yclients_client_id && (
            <Field label={ui.crmId} value={<span className="tabular-nums">{care.yclients_client_id}</span>} />
          )}
        </div>

        {/* Заметка оператора — свободный текст. Пустая заметка названа словом:
            пустое место читается как «поле сломалось». */}
        <div className="mt-3 border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">{ui.note}</span>
          <p className="mt-1 whitespace-pre-wrap text-xs">
            {person.comment || <span className="text-muted-foreground">{ui.noNote}</span>}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <H4 variant="ui" className="mb-3">{ui.summary}</H4>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {/* 🔒 ВИЗИТЫ И СТРОКИ УСЛУГ — РАЗНЫЕ ЧИСЛА, И ОБА ПОКАЗАНЫ. Приём с
              двумя услугами даёт одну запись CRM и две строки. Показать одно
              число значило бы, что история под ним не сходится с итогом над ней. */}
          <Stat label={ui.visits} value={care.visits} />
          <Stat label={ui.serviceLines} value={visitRows} />
          <Stat label={ui.spent} value={money(care.ltv)} />
          <Stat label={ui.lastVisit} value={last ?? <span className="text-muted-foreground">{ui.never}</span>} />
          <Stat label={ui.nextVisit} value={ahead ?? <span className="text-muted-foreground">{ui.none}</span>} />
          {typeof care.visits_fail_count === "number" && (
            <Stat label={ui.missedCount} value={care.visits_fail_count} />
          )}
        </div>
      </section>
    </div>
  )
}
