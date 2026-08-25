import { Skeleton } from "@/components/ui/skeleton"

// Скелетон ЭТОЙ таблицы — пять колонок, ровно её собственные.
//
// 🔒 ПОЧЕМУ НЕ ОБЩИЙ. Общий скелетон заранее решает, что все таблицы одной
// формы, и чужая рама во время загрузки означала бы, что разметка дёрнется,
// когда придёт ответ. У соседней таблицы учётных записей колонок тоже пять — и
// это совпадение, а не основание объединять: у неё они другие.
//
// Рама и заголовки статические: они известны до всякого запроса и рисуются без
// JavaScript — вместо пустого «Загрузка…».
const ROWS = 8

export function PatientsTableSkeleton(
  { labels }: {
    labels: {
      colPerson: string
      colVisits: string
      colLastVisit: string
      colAhead: string
      colSpent: string
    }
  },
) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[42rem] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colPerson}</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{labels.colVisits}</th>
            <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colLastVisit}</th>
            <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colAhead}</th>
            <th className="w-32 px-4 py-2.5 text-right font-medium text-muted-foreground">{labels.colSpent}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROWS }, (_, i) => (
            <tr key={i} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-52" /></td>
              <td className="px-4 py-2.5"><Skeleton className="ml-auto h-4 w-8" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>
              <td className="px-4 py-2.5"><Skeleton className="ml-auto h-4 w-16" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
