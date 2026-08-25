import { Skeleton } from "@/components/ui/skeleton"

// Скелетон правил — карточки той же формы, что придут в ответе.
export function ScenarioRulesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="mt-2 h-3 w-40" />
          <div className="mt-4 flex gap-6">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
