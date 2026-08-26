"use client"

// ВИДЖЕТ «переписка» — единица владения: выборка, список веток, ветка, слова.
//
// 🔒 ВЕТКА ПО ТЕЛЕФОНУ, А НЕ ПО ЧЕЛОВЕКУ. Номер, которого нет ни в одной
// карточке, показывается наравне с остальными и помечается словом: это живое
// обращение, и разобрать его должен человек. ✗ Ключевание по `person_id`
// потеряло бы ровно те ветки, ради которых экран и нужен.

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Metric, Small, H4 } from "@/components/ui/typography"
import { ArrowLeft, Wand2 } from "lucide-react"
import { useThreads, useSending } from "./use-threads"
import { Thread } from "./thread.client"
import { when, phone as fmtPhone } from "./format"
import type { MessageThreadsUi } from "./ui.i18n"

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <Metric className="tabular-nums">{value}</Metric>
      <Small className="text-muted-foreground">{label}</Small>
    </div>
  )
}

export function MessageThreads({ lang, ui }: { lang: string; ui: MessageThreadsUi }) {
  const { loading, threads, summary, openPhone, messages, open, close, testPhone } = useThreads(ui)
  const { sending, typing, send } = useSending(ui, open)

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-full max-w-md" />
          </div>
        ))}
      </div>
    )
  }

  // ── Одна ветка ────────────────────────────────────────────────────────────
  if (openPhone) {
    const thread = threads.find(t => t.phone === openPhone)
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <H4 variant="ui">
            {ui.threadOf} {thread?.full_name ?? fmtPhone(openPhone)}
          </H4>
          <div className="flex items-center gap-2">
            {thread?.person_id && (
              <Link
                href={`/${lang}/patients/${thread.person_id}`}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {ui.openCard}
              </Link>
            )}
            <Button size="sm" variant="ghost" onClick={close}>
              <ArrowLeft size={12} />{ui.back}
            </Button>
          </div>
        </div>

        {/* 🪦 ЗДЕСЬ БЫЛИ САМОДЕЛЬНЫЕ ПУЗЫРИ — список сообщений без ленты, без поля ввода
            и без прокрутки к свежему. Заменены лентой на AI Elements (шаг 25, решение
            владельца о четвёртой библиотеке). Разговор — предмет, у которого есть
            устоявшийся вид; собирать его руками значило платить за чужой опыт заново. */}
        <Thread
          messages={messages}
          ui={ui}
          lang={lang}
          isTest={Boolean(testPhone) && openPhone === testPhone}
          sending={sending}
          typing={typing}
          onSend={(text, files, channel) => send(openPhone, text, files, channel)}
        />
      </div>
    )
  }

  // ── Список веток ──────────────────────────────────────────────────────────
  return (
    <>
      {summary.messages > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-6">
          <Stat value={summary.threads} label={ui.sumThreads} />
          <Stat value={summary.messages} label={ui.sumMessages} />
          <Stat value={summary.unknownNumbers} label={ui.sumUnknown} />
          <Stat value={summary.aiReplies} label={ui.sumAi} />
        </div>
      )}

      {/* 🔒 ДЕМОНСТРАЦИОННЫЕ ВЕТКИ НАЗВАНЫ НА ЭКРАНЕ (Рома, 2026-08-25). Он попросил
          посеять переписку, чтобы увидеть вид экрана, — законная просьба. Незаконно
          другое: оставить выдуманные обращения неотличимыми от живых. Через неделю
          никто не вспомнит, что эти пять сообщений посеяли для показа, и оператор
          пойдёт разбирать несуществующее обращение. Поэтому канал `demo` виден и
          строкой сверху, и пометкой на каждой такой ветке. */}
      {Boolean(testPhone) && threads.some(t => t.phone === testPhone) && (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground">
          {ui.demoNotice}
        </p>
      )}

      {/* 🔒 КНОПКА ВЕДЁТ В ВЕТКУ ТЕСТОВОГО ЮЗЕРА, А НЕ СЕЕТ ВЫДУМАННОЕ (шаг 30, заказ
          Ромы). Нет такого юзера — говорим, где его завести, а не прячем кнопку: спрятанная
          возможность неотличима от отсутствующей. */}
      <div className="mb-4">
        {testPhone ? (
          <Button size="sm" variant="outline" onClick={() => void open(testPhone)}>
            <Wand2 size={12} />{ui.demoOn}
          </Button>
        ) : (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            {ui.noTestUser}
          </p>
        )}
      </div>

      {threads.length === 0 ? (
        <EmptyState title={ui.empty} hint={ui.emptyHint} />
      ) : (
        <div className="space-y-2">
          {threads.map(t => (
            <button
              key={t.phone}
              onClick={() => void open(t.phone)}
              className="block w-full rounded-xl border border-border p-4 text-left hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{t.full_name ?? fmtPhone(t.phone)}</span>
                {!t.person_id && (
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal" title={ui.unknownNumberHint}>
                    {ui.unknownNumber}
                  </Badge>
                )}
                {t.phone === testPhone && (
                  <Badge variant="outline" className="border-amber-500/50 px-1.5 py-0 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                    {ui.demoBadge}
                  </Badge>
                )}
                {t.consent_to_contact === 0 && (
                  <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-normal">
                    {ui.noConsent}
                  </Badge>
                )}
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{when(t.last_at)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.last_text}</p>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
