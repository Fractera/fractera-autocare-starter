"use client"

// ВИДЖЕТ «карточка человека» — динамический островок в статической оболочке.
//
// 🔒 ЕДИНИЦА ВЛАДЕНИЯ: выборка, скелетон, связь, итог, история, форматы, слова —
// всё в этой папке. Снеси папку маршрута, и виджет исчезнет целиком, не оставив
// ссылок; это и есть его приёмка.
//
// 🔒 ИМЯ ЧЕЛОВЕКА РИСУЕТ ОСТРОВОК, А НЕ ЗАГОЛОВОК СТРАНИЦЫ. Оболочка статическая
// и об имени не знает — знать его на сервере значило бы сходить в базу до
// сессии. Поэтому `<h1>` страницы говорит, ЧТО это за экран, а имя стоит внутри
// карточки, где ему и место.

import Link from "next/link"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { H2, H4 } from "@/components/ui/typography"
import { usePerson } from "./use-person"
import { PersonCardSkeleton } from "./skeleton"
import { PersonSummary } from "./summary.client"
import { PersonVisits } from "./visits.client"
import type { PersonCardUi } from "./ui.i18n"

export function PersonCard({ id, lang, ui }: { id: string; lang: string; ui: PersonCardUi }) {
  const state = usePerson(id, ui)
  const labels = { contacts: ui.contacts, summary: ui.summary, history: ui.history }

  const back = (
    <Link
      href={`/${lang}/patients`}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={12} />{ui.back}
    </Link>
  )

  if (state.kind === "loading") return <PersonCardSkeleton labels={labels} />

  // «Нет такого» и «не смогли прочитать» — разные события и разные слова: первое
  // означает, что искать нечего, второе — что стоит повторить.
  if (state.kind === "missing") {
    return (
      <div className="space-y-4">
        <EmptyState title={ui.notFound} hint={ui.notFoundHint} />
        {back}
      </div>
    )
  }
  if (state.kind === "failed") {
    return (
      <div className="space-y-4">
        <EmptyState title={ui.failed} />
        {back}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <H2 variant="ui">{state.person.full_name}</H2>
        <div className="flex items-center gap-2">
          {/* 🔒 ДОРОГА С КАРТОЧКИ В ПЕРЕПИСКУ (Рома, 2026-08-25). Карточка обещает
              «визиты, задачи, ПЕРЕПИСКА и история одного человека», а перейти из неё в
              разговор было нельзя: оператор возвращался в список и искал номер руками.
              Ведёт на экран переписки, УЖЕ ОТКРЫТЫЙ на ветке этого человека, — иначе
              кнопка экономит одно нажатие и дарит поиск.

              🔒 БЕЗ ТЕЛЕФОНА КНОПКИ НЕТ. Ветка привязана к номеру; у человека без
              номера открывать нечего, и кнопка вела бы в пустоту, обещав разговор.

              🔒 СНЯТОЕ СОГЛАСИЕ КНОПКУ НЕ УБИРАЕТ. Запрет писать — это запрет на
              РАССЫЛКУ, а не на чтение того, что человек написал сам; спрятав вход,
              мы спрятали бы от оператора его живые обращения. */}
          {state.person.phone && (
            <Link
              href={`/${lang}/messages?phone=${encodeURIComponent(state.person.phone)}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MessageSquare size={12} />{ui.openChat}
            </Link>
          )}
          {back}
        </div>
      </div>

      <PersonSummary
        person={state.person}
        care={state.care}
        visitRows={state.visits.length}
        ui={ui}
      />

      <section>
        <H4 variant="ui" className="mb-3">{ui.history}</H4>
        <PersonVisits visits={state.visits} ui={ui} />
      </section>
    </div>
  )
}
