"use client"

// ПОЛОСА ОТМЕНЫ НАД ОЧЕРЕДЬЮ — заказ Ромы 2026-08-25.
//
// 🔒 ДВЕ РАЗНЫЕ КНОПКИ, А НЕ ОДНА С РАЗНЫМ ПОВЕДЕНИЕМ. Владелец описал это точно: выбрал
// кружочки — «отменить рассылку»; не выбрал ни одного — «отменить ВСЕ». Соблазн сделать
// одну кнопку, которая «сама поймёт», опасен ровно тем, что сбой выбора превращает отмену
// одной задачи в отмену всей очереди.
//
// 🔒 ПОДТВЕРЖДЕНИЕ РАЗНОЕ ПО ТЕКСТУ, А НЕ ТОЛЬКО ПО НАЛИЧИЮ. Окно «вы уверены?» человек
// пролистывает не читая; окно, которое называет ЧИСЛО и ПОСЛЕДСТВИЕ, читают.

import { useState } from "react"
import { toast } from "sonner"
import { XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
// 🔒 ОКНО ПРОЕКТА, А НЕ СВОЁ И НЕ ЧУЖОЕ. В проекте один хозяин у окон — `AppDialog`, и
// гейт `check:dialogs` следит за этим по делу: ручная подложка не несёт ни роли диалога,
// ни ловушки фокуса, ни Escape, ни замка прокрутки. Выглядит одинаково, а с клавиатуры
// не работает.
import { AppDialog } from "@/components/dialog/app-dialog.client"
import type { AppDialogUi } from "@/components/dialog/app-dialog.i18n"
import type { TasksQueueUi } from "./ui.i18n"

export function CancelBar(
  { ui, dialogUi, selected, onDone }: { ui: TasksQueueUi; dialogUi: AppDialogUi; selected: string[]; onDone: () => void },
) {
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const all = selected.length === 0

  const run = async () => {
    setBusy(true)
    try {
      const r = await fetch("/api/care/tasks/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { ids: selected }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.ok) { toast.error(ui.cancelFailed); return }
      toast.success(ui.cancelled.replace("{n}", String(d.cancelled)).replace("{left}", String(d.left)))
      onDone()
    } catch {
      toast.error(ui.cancelFailed)
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        // 🔒 «ВСЕ» ВЫГЛЯДИТ ОПАСНЕЕ, ЧЕМ «ВЫБРАННЫЕ», И ЭТО ЧАСТЬ ЗАЩИТЫ: цвет
        // предупреждает раньше, чем человек прочитает надпись.
        variant={all ? "destructive" : "outline"}
        size="sm"
        disabled={busy}
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
        {busy ? ui.cancelling : all ? ui.cancelAll : `${ui.cancelSelected} (${selected.length})`}
      </Button>

      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title={ui.confirmTitle}
        description={all ? ui.confirmAll : ui.confirmSelected}
        ui={dialogUi}
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setOpen(false)}>
              {ui.confirmKeep}
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => void run()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {ui.confirmDo}
            </Button>
          </>
        }
      />
    </>
  )
}
