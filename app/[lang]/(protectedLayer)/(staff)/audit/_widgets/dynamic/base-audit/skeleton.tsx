import { Skeleton } from "@/components/ui/skeleton"
import { H4 } from "@/components/ui/typography"

// Скелетон аудита: четыре раздела, ровно его собственная форма. Заголовки
// разделов статические — они известны до всякого запроса и рисуются без
// JavaScript, вместо пустого «Загрузка…».

export function BaseAuditSkeleton(
  { labels }: { labels: { size: string; gaps: string; crm: string; sync: string } },
) {
  const block = (title: string, cards: number) => (
    <section key={title}>
      <H4 variant="ui" className="mb-3">{title}</H4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-4/5" />
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <div className="space-y-8">
      {block(labels.size, 3)}
      {block(labels.gaps, 3)}
      {block(labels.crm, 2)}
      {block(labels.sync, 3)}
    </div>
  )
}
