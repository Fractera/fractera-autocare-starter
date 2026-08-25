import { Skeleton } from "@/components/ui/skeleton"

// Скелетон ЭТОЙ очереди — четыре колонки, её собственные. Рама и заголовки
// статические: рисуются без JavaScript вместо пустого «Загрузка…».
const ROWS = 8

export function TasksQueueSkeleton(
  { labels }: { labels: { colPerson: string; colReason: string; colDue: string; colStatus: string } },
) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[38rem] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colPerson}</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colReason}</th>
            <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colDue}</th>
            <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colStatus}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROWS }, (_, i) => (
            <tr key={i} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-48" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-40" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-24" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
