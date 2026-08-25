import { Skeleton } from "@/components/ui/skeleton"
import { H4 } from "@/components/ui/typography"

// Скелетон ЭТОЙ карточки — её собственная форма: две колонки сверху, таблица
// истории снизу. Рама и заголовки статические: они известны до всякого запроса и
// рисуются без JavaScript — вместо пустого «Загрузка…».
//
// 🔒 ФОРМА ЗАГРУЗКИ СОВПАДАЕТ С ФОРМОЙ ОТВЕТА. Не совпадёт — разметка дёрнется в
// момент прихода данных, и это заметно именно на карточке: она выше списка, и
// прыжок уводит уже прочитанное из-под глаз.

export function PersonCardSkeleton(
  { labels }: { labels: { contacts: string; summary: string; history: string } },
) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border p-4">
          <H4 variant="ui" className="mb-3">{labels.contacts}</H4>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-4 w-48" />)}
          </div>
        </section>

        <section className="rounded-xl border border-border p-4">
          <H4 variant="ui" className="mb-3">{labels.summary}</H4>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </section>
      </div>

      <section>
        <H4 variant="ui" className="mb-3">{labels.history}</H4>
        <div className="overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-4 py-2.5 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
