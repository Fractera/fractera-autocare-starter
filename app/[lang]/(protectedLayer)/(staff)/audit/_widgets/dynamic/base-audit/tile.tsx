import { Metric, Small } from "@/components/ui/typography"

// Плитка одного числа аудита: значение, что это, и почему это важно.
//
// 🔒 ОБЪЯСНЕНИЕ — ОБЯЗАТЕЛЬНАЯ ЧАСТЬ ПЛИТКИ, А НЕ ПОДСКАЗКА ПРИ НАВЕДЕНИИ.
// Экран отвечает на «можно ли доверять цифрам»; число без слов не отвечает
// ни на что, а спрятанное под наведение недоступно с пальца.

export function AuditTile(
  { value, label, hint, tone = "plain" }: {
    value: React.ReactNode
    label: string
    hint: string
    /** `warn` — число, требующее решения, а не просто сведение. */
    tone?: "plain" | "warn"
  },
) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === "warn" ? "border-destructive/40 bg-destructive/5" : "border-border"
      }`}
    >
      <Metric className="tabular-nums">{value}</Metric>
      <Small className="text-foreground">{label}</Small>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}
