"use client"

// ОСТРОВОК ПАСПОРТА: спрашивает дверь, показывает текст или причину отказа.
//
// 🔒 ЭТО ЕДИНСТВЕННОЕ МЕСТО, ГДЕ ПАСПОРТ ПОЯВЛЯЕТСЯ. Оболочка страницы
// предрендерена и текста не несёт — гость, запросивший адрес, получает каркас
// без единой строки документа. Проверяется это не доверием, а `curl` без
// сессии и поиском по разметке.
//
// 🔒 ОФОРМЛЕНИЕ — ОБЫЧНЫЙ MARKDOWN, БЕЗ ПРЕДМЕТОВ ДИЗАЙНА (решение владельца).
// Ни карточек, ни секций каталога: паспорт читают, а не рассматривают. Все цвета
// взяты токенами темы, поэтому переключение светлой и тёмной работает само —
// абсолютных значений в файле нет ни одного.
//
// 🔒 ПОЧЕМУ `react-markdown` + `remark-gfm`, А НЕ СВОЙ РАЗБОРЩИК. Рендерера
// markdown в проекте не было: `lib/aio/*` умеет обратное — блоки в markdown для
// машин. Свой разборщик здесь был бы изобретением, а паспорт наполовину состоит
// из таблиц, которых базовый markdown не знает. `react-markdown` уже объявлен в
// зависимостях (осознанный резерв владельца, ANTI-PATTERNS), `remark-gfm`
// физически лежал транзитивно и объявлен прямо тем же шагом.

import { useCallback, useEffect, useState } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { H1, H2, H3, H4, P } from "@/components/ui/typography"
import type { PassportViewUi } from "./ui.i18n"

type State =
  | { kind: "loading" }
  | { kind: "ready"; markdown: string }
  | { kind: "denied"; reason: "unauthorized" | "forbidden" | "missing" | "failed" }

/** Ответ двери — причина отказа берётся из КОДА, а не из тела: тело может быть пустым. */
function reasonOf(status: number): "unauthorized" | "forbidden" | "missing" | "failed" {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "missing"
  return "failed"
}

// Разметка markdown токенами темы. Карта объявлена ОДИН раз на модуль, а не
// внутри компонента: пересоздаваемая на каждый рендер, она заставляла бы
// react-markdown перестраивать всё дерево на любое изменение состояния.
const MD: Components = {
  // 🔒 ЗАГОЛОВКИ И ТЕКСТ — ТОЛЬКО ПРИМИТИВОМ. Шкала в проекте одна
  // (`components/ui/typography.tsx`), и `check:typography` валит сборку на
  // строчном теге заголовка, которому приписали классы. ✗ поймано боевой
  // сборкой 2026-08-24: здесь стояли три руками оформленных заголовка, и они
  // прошли локальный прогон только потому, что я не запустил этот гейт.
  // Классы тут остались лишь на ОТСТУПЫ — размер и начертание принадлежат шкале.
  //
  // ✗ И второй раз тот же гейт поймал ЭТОТ комментарий: сторож построчный, он
  // не отличает пример в тексте от кода. Образец нарушения не цитируется даже
  // в объяснении — называется словами.
  //
  // `variant="ui"` — паспорт рабочий экран, а не витрина.
  h1: p => <H1 className="mt-8 mb-3" {...p} />,
  h2: p => <H2 variant="ui" className="mt-8 mb-3 border-b border-border pb-1" {...p} />,
  h3: p => <H3 variant="ui" className="mt-6 mb-2" {...p} />,
  h4: p => <H4 variant="ui" className="mt-5 mb-2" {...p} />,
  p: p => <P className="my-3" {...p} />,
  ul: p => <ul className="my-3 list-disc space-y-1 pl-6 text-foreground" {...p} />,
  ol: p => <ol className="my-3 list-decimal space-y-1 pl-6 text-foreground" {...p} />,
  li: p => <li className="leading-relaxed" {...p} />,
  strong: p => <strong className="font-semibold text-foreground" {...p} />,
  hr: p => <hr className="my-8 border-border" {...p} />,
  blockquote: p => (
    <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground" {...p} />
  ),
  a: p => <a className="underline underline-offset-2 hover:text-muted-foreground" {...p} />,
  code: p => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground" {...p} />,
  pre: p => (
    // Широкий блок прокручивается ВНУТРИ себя: страница не должна ехать вбок.
    <pre className="my-4 overflow-x-auto rounded border border-border bg-muted p-3 text-xs" {...p} />
  ),
  // Таблицы паспорта широкие по природе — оборачиваются в свою прокрутку.
  table: p => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  th: p => (
    <th className="border border-border bg-muted px-2 py-1 text-left align-top font-semibold text-foreground" {...p} />
  ),
  td: p => <td className="border border-border px-2 py-1 align-top text-foreground" {...p} />,
}

export function PassportView({ ui }: { ui: PassportViewUi }) {
  const [state, setState] = useState<State>({ kind: "loading" })

  const load = useCallback(() => {
    let alive = true
    setState({ kind: "loading" })
    fetch("/api/passport", { cache: "no-store" })
      .then(async res => {
        if (!alive) return
        if (!res.ok) return setState({ kind: "denied", reason: reasonOf(res.status) })
        const data = (await res.json().catch(() => null)) as { markdown?: string } | null
        // Пустой ответ — это отказ, а не пустой паспорт: дверь на успехе всегда
        // отдаёт текст, и «успех без текста» означает поломку, а не документ.
        if (!data?.markdown) return setState({ kind: "denied", reason: "failed" })
        setState({ kind: "ready", markdown: data.markdown })
      })
      .catch(() => alive && setState({ kind: "denied", reason: "failed" }))
    return () => { alive = false }
  }, [])

  useEffect(() => load(), [load])

  if (state.kind === "loading") {
    return (
      <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {ui.loading}
      </p>
    )
  }

  if (state.kind === "denied") {
    return (
      <div className="mt-8 flex max-w-2xl items-start gap-3 rounded border border-border p-4">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm text-foreground">{ui[state.reason]}</p>
          {/* Повтор предлагается только там, где он способен помочь: отказ по
              праву от нажатия кнопки не изменится, а сетевой сбой — может. */}
          {(state.reason === "failed" || state.reason === "missing") && (
            <Button variant="outline" size="sm" className="mt-3" onClick={load}>
              {ui.retry}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <article className="mt-8 max-w-4xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
        {state.markdown}
      </ReactMarkdown>
    </article>
  )
}
