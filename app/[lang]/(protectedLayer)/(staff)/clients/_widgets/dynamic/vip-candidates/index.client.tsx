"use client"

// ВИДЖЕТ «кандидаты в VIP».
//
// 🔒 ЭКРАН ОТВЕЧАЕТ «КОМУ ДАВАТЬ», А НЕ «ДАЁТ». Роль `vip_user` живёт в службе
// авторизации, и связи между человеком из CRM и учётной записью в данных НЕТ:
// почта заполнена у 242 из 1844. Сделать вид, что связь есть, значило бы строить
// выдачу роли на догадке по почте и однажды выдать VIP не тому.
//
// 🔒 ПРЕДЕЛ НАЗВАН НА САМОМ ЭКРАНЕ, А НЕ В ОТЧЁТЕ. Человек, открывший «Клиенты»
// ради выдачи роли, обязан за пять секунд понять, почему кнопки здесь нет и куда
// идти.

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { H4 } from "@/components/ui/typography"
import type { VipCandidatesUi } from "./ui.i18n"

type Candidate = {
  id: string
  full_name: string
  phone: string
  email: string | null
  consent_to_contact: number
  visits: number
  revenue: number
  last_visit: string | null
}

function money(v: number): string {
  return Math.round(v || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")
}

function humanDate(iso: string | null): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null
}

export function VipCandidates({ lang, ui }: { lang: string; ui: VipCandidatesUi }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Candidate[]>([])
  const [link, setLink] = useState<{ withEmail: number; total: number }>({ withEmail: 0, total: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/care/vip-candidates?limit=30", { cache: "no-store" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(res.status === 401 || res.status === 403 ? ui.forbidden : res.status === 502 ? ui.unreachable : ui.failed)
        return
      }
      setRows(Array.isArray(j.candidates) ? j.candidates : [])
      setLink(j.link ?? { withEmail: 0, total: 0 })
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setLoading(false)
    }
  }, [ui])

  const started = useRef(false)
  useEffect(() => { if (started.current) return; started.current = true; void load() }, [load])

  return (
    <>
      <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4">
        <H4 variant="ui" className="mb-2">{ui.howTitle}</H4>
        <p className="text-xs leading-relaxed text-muted-foreground">{ui.howText}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {ui.linkStat.replace("{n}", String(link.withEmail)).replace("{total}", String(link.total))}
        </p>
        <Link
          href={`/${lang}/administration/users`}
          className="mt-2 inline-block text-xs underline-offset-2 hover:underline"
        >
          {ui.toAccounts}
        </Link>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`flex items-center gap-4 px-4 py-2.5 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
              <Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={ui.empty} hint={ui.emptyHint} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[40rem] text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colPerson}</th>
                <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colVisits}</th>
                <th className="w-32 px-4 py-2.5 text-right font-medium text-muted-foreground">{ui.colRevenue}</th>
                <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colLast}</th>
                <th className="w-48 px-4 py-2.5 text-left font-medium text-muted-foreground">{ui.colEmail}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/${lang}/patients/${r.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {r.full_name}
                    </Link>
                    {!r.consent_to_contact && (
                      <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-[10px] font-normal">
                        {ui.noConsent}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.visits}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(r.revenue)}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {humanDate(r.last_visit) ?? <span className="text-muted-foreground">{ui.never}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.email ?? (
                      <span className="text-muted-foreground" title={ui.noEmailHint}>{ui.noEmail}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
