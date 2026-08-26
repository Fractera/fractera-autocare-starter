"use client"

// ПОЛЕ КАРТИНКИ в настройках компании — логотип и значок вкладки (заказ Ромы 2026-08-25).
//
// 🔒 ОДИН КОМПОНЕНТ НА ОБА ПОЛЯ, ПОТОМУ ЧТО ОНИ ОДИНАКОВЫ ПО ПОВЕДЕНИЮ: выбрать файл,
// увидеть, что вышло, убрать. Различаются они только словами и назначением, а слова
// приходят пропсами. Две копии этой формы разошлись бы при первой же правке.
//
// 🔒 ПОКАЗЫВАЕМ ТО, ЧТО ЛЕЖИТ, А НЕ ИМЯ ФАЙЛА. Логотип выбирают глазами, и строка вида
// `/api/media/44a8…/file` не отвечает на вопрос «та ли это картинка».

import { useRef } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Small } from "@/components/ui/typography"

export function ImageField(
  { id, label, hint, value, busy, disabled, uploadLabel, busyLabel, removeLabel, onPick, onClear }: {
    id: string
    label: string
    hint: string
    value: string
    busy: boolean
    disabled: boolean
    uploadLabel: string
    busyLabel: string
    removeLabel: string
    onPick: (file: File) => void
    onClear: () => void
  },
) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>

      <div className="flex items-center gap-3">
        {/* Клетчатой подложки нет намеренно: логотип чаще всего прозрачный, и её узор
            спорил бы с самим знаком. Рамка достаточно показывает границы. */}
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="size-16 rounded-lg border border-border object-contain p-1" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <Upload className="size-4" />
          </span>
        )}

        <div className="flex items-center gap-2">
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onPick(file)
              // 🔒 ПОЛЕ ОЧИЩАЕТСЯ ПОСЛЕ ВЫБОРА: без этого повторный выбор ТОГО ЖЕ файла
              // не поднимает событие, и человек нажимает, ничего не добившись.
              e.target.value = ""
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
            {busy ? <><Loader2 className="size-3.5 animate-spin" />{busyLabel}</> : <><Upload className="size-3.5" />{uploadLabel}</>}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled || busy} onClick={onClear}>
              <X className="size-3.5" />{removeLabel}
            </Button>
          )}
        </div>
      </div>

      <Small className="text-muted-foreground">{hint}</Small>
    </div>
  )
}
