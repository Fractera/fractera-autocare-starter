"use client"

// ЧТО ВИДИТ НА ГЛАВНОЙ ВОШЕДШИЙ — по его роли (шаг 28, заказ Ромы 2026-08-25).
//
// 🔒 ОСТРОВОК, А НЕ СЕРВЕРНАЯ ВЕТКА, И ЭТО НЕ ВЫБОР УДОБСТВА. Главная — статическая
// страница: её разметка собирается на сборке, когда никакого «вошедшего» не существует.
// Спросить роль на сервере можно только через `cookies()`/`headers()`, а это ровно та
// строка, что превращает страницу в динамическую и лишает её пререндера. Поэтому сервер
// печатает то, что верно ДЛЯ ВСЕХ (приглашение войти), а островок заменяет это после
// гидратации. Тот же приём, что у кнопки аккаунта в шапке.
//
// 🔒 ДО ОТВЕТА `/api/me` НА ЭКРАНЕ ОСТАЁТСЯ ГОСТЕВАЯ КНОПКА, а не пустота и не «загрузка».
// Ответ приходит за миг, но этот миг видят все — и мигание блока под заголовком читается
// как поломка страницы.

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { LayoutDashboard, Send, UserRound, CheckCircle2, Clock } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Small } from "@/components/ui/typography"
import { H3 } from "@/components/ui/typography"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import type { HomeCtaUi } from "./cta.i18n"

type Me = { userId: string; email: string; roles: string[] } | null

/** Одна кнопка-приглашение — общая форма для ролей, которым нужен переход. */
function GoButton(
  { href, label, hint, icon }: { href: string; label: string; hint: string; icon: React.ReactNode },
) {
  return (
    <div className="mt-10 flex flex-col items-center gap-2">
      <Link href={href} className={buttonVariants({ size: "lg" }) + " gap-2"}>
        {icon}{label}
      </Link>
      <Small className="text-muted-foreground">{hint}</Small>
    </div>
  )
}

export function HomeCtaByRole({ lang, ui, guest }: { lang: string; ui: HomeCtaUi; guest: React.ReactNode }) {
  const [me, setMe] = useState<Me | undefined>(undefined)
  const [mine, setMine] = useState<{ status: string } | null>(null)
  const [name, setName] = useState("")
  const [sending, setSending] = useState(false)
  const [justSent, setJustSent] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" })
        const d = r.ok ? await r.json() : null
        if (!alive) return
        setMe(d?.userId ? d : null)
        // Своя заявка спрашивается только у того, кому форма вообще положена: у
        // менеджера её не бывает, и лишний запрос был бы вопросом ни о чём.
        if (d?.userId && !PROTECTED_GROUP_ROLES.staff.some((x: string) => (d.roles ?? []).includes(x))) {
          const q = await fetch("/api/care/client-request", { cache: "no-store" })
          const qd = q.ok ? await q.json() : null
          if (alive && qd?.mine) setMine(qd.mine)
        }
      } catch {
        if (alive) setMe(null)
      }
    })()
    return () => { alive = false }
  }, [])

  // Ответа ещё нет или человек не вошёл — остаётся то, что напечатал сервер.
  if (me === undefined || me === null) return <>{guest}</>

  const roles = me.roles ?? []
  const has = (list: readonly string[]) => list.some(r => roles.includes(r))

  // 🔒 ПОРЯДОК ПРОВЕРОК ЗНАЧИМ: человек бывает сразу нескольких ролей, и показать надо
  // САМУЮ СИЛЬНУЮ. Сотрудник, у которого есть и `user`, должен увидеть дашборд, а не
  // форму заявки на самого себя.
  if (has(PROTECTED_GROUP_ROLES.admin) || has(PROTECTED_GROUP_ROLES.staff)) {
    return <GoButton href={`/${lang}/dashboard`} label={ui.toDashboard} hint={ui.dashboardHint} icon={<LayoutDashboard className="size-4" />} />
  }

  if (roles.includes("vip_user")) {
    return <GoButton href={`/${lang}/cabinet`} label={ui.toVip} hint={ui.vipHint} icon={<UserRound className="size-4" />} />
  }

  // Остальные вошедшие — кандидаты в клиенты.
  if (justSent || mine) {
    const sent = justSent
    return (
      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {sent ? <CheckCircle2 className="size-4 text-primary" /> : <Clock className="size-4 text-muted-foreground" />}
          {sent ? ui.sentTitle : ui.pendingTitle}
        </span>
        <Small className="max-w-md text-muted-foreground">{sent ? ui.sentBody : ui.pendingBody}</Small>
        <Link href={`/${lang}/cabinet`} className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-2 gap-2"}>
          <UserRound className="size-3.5" />{ui.toCabinet}
        </Link>
      </div>
    )
  }

  const submit = async () => {
    if (!name.trim()) { toast.error(ui.errEmptyName); return }
    setSending(true)
    try {
      const r = await fetch("/api/care/client-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(d?.error === "exists" ? ui.errExists : d?.error === "empty" ? ui.errEmptyName : ui.failed)
        // «Уже есть заявка» — не отказ, а состояние: показываем его вместо формы.
        if (d?.error === "exists") setMine({ status: "new" })
        return
      }
      toast.success(ui.sentTitle, { description: ui.sentBody })
      setJustSent(true)
    } catch {
      toast.error(ui.failed)
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      className="mx-auto mt-10 flex w-full max-w-sm flex-col gap-4 text-left"
      onSubmit={e => { e.preventDefault(); void submit() }}
    >
      <div className="text-center">
        <H3 variant="ui">{ui.requestTitle}</H3>
        <Small className="mt-1 block text-muted-foreground">{ui.requestHint}</Small>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cta-name">{ui.nameLabel}</Label>
        <Input id="cta-name" value={name} placeholder={ui.namePlaceholder} disabled={sending} onChange={e => setName(e.target.value)} />
      </div>

      {/* 🔒 ПОЧТА ПОКАЗАНА, НО НЕ РЕДАКТИРУЕТСЯ, и это решение о безопасности, а не об
          удобстве. Правка почты в заявке — это заявка от чужого имени: менеджер свяжется
          не с тем человеком. Дверь её из тела запроса вообще не читает, берёт из сессии;
          поле стоит здесь, чтобы человек ВИДЕЛ, куда придёт ответ. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cta-email">{ui.emailLabel}</Label>
        <Input id="cta-email" value={me.email} readOnly disabled aria-describedby="cta-email-hint" />
        <Small id="cta-email-hint" className="text-muted-foreground">{ui.emailHint}</Small>
      </div>

      <Button type="submit" disabled={sending} className="gap-2">
        <Send className="size-4" />{sending ? ui.sending : ui.send}
      </Button>
    </form>
  )
}
