import { Skeleton } from "@/components/ui/skeleton"

// Скелетон каталога — пять колонок, его собственные.
export function CatalogueSkeleton(
  { labels }: { labels: { colService: string; colVisits: string; colPeople: string; colRevenue: string; colLast: string } },
) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[40rem] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colService}</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{labels.colVisits}</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">{labels.colPeople}</th>
            <th className="w-32 px-4 py-2.5 text-right font-medium text-muted-foreground">{labels.colRevenue}</th>
            <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">{labels.colLast}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, i) => (
            <tr key={i} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-56" /></td>
              <td className="px-4 py-2.5"><Skeleton className="ml-auto h-4 w-10" /></td>
              <td className="px-4 py-2.5"><Skeleton className="ml-auto h-4 w-10" /></td>
              <td className="px-4 py-2.5"><Skeleton className="ml-auto h-4 w-16" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
