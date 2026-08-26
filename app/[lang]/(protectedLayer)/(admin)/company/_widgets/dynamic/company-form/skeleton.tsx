// Скелетон формы: три поля и полоса кнопок — ровно то, что придёт. Своей высоты не
// выдумывает: прыжок макета при появлении данных читается как поломка.
export function CompanyFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {[0, 1, 2].map(i => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full max-w-md animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-64 animate-pulse rounded bg-muted" />
        </div>
      ))}
      <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
    </div>
  )
}
