import { AlertTriangle } from "lucide-react"
import { H4, Small } from "@/components/ui/typography"
import type { TroublesUi } from "./troubles.i18n"

// БЛОК «ПОЧЕМУ НЕ ПРИХОДИТ СООБЩЕНИЕ» — заказ Ромы 2026-08-25: «создай блок в настройках
// канала связи внизу, в красной рамке напиши возможные варианты ошибок; всё, что здесь мы
// с тобой получили опытным путём».
//
// 🔒 СЕРВЕРНЫЙ КОМПОНЕНТ, БЕЗ ОСТРОВКА. Таблица неизменна и ничего не спрашивает у
// браузера: JavaScript ради статического текста — плата ни за что.
//
// 🔒 КРАСНАЯ РАМКА — ЭТО ЗАКАЗ, НО У НЕЁ ЕСТЬ И СМЫСЛ. Блок читают в тот момент, когда
// что-то уже не работает; он обязан находиться взглядом, а не поиском по странице.
export function Troubles({ ui }: { ui: TroublesUi }) {
  return (
    <section className="mt-10 rounded-xl border-2 border-destructive/50 bg-destructive/[0.03] p-5">
      <H4 variant="ui" className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="size-4" />{ui.title}
      </H4>
      <Small className="mt-1 block max-w-3xl text-muted-foreground">{ui.subtitle}</Small>

      {/* Таблица прокручивается внутри себя: на узком экране три колонки не помещаются, а
          горизонтальная прокрутка ВСЕЙ страницы — дефект вёрстки. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="w-1/4 py-2 pr-3 font-medium text-muted-foreground">{ui.colSymptom}</th>
              <th className="w-2/5 py-2 pr-3 font-medium text-muted-foreground">{ui.colCause}</th>
              <th className="py-2 font-medium text-muted-foreground">{ui.colFix}</th>
            </tr>
          </thead>
          <tbody>
            {ui.items.map((t, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0 align-top">
                <td className="py-3 pr-3 font-medium text-foreground">{t.symptom}</td>
                <td className="py-3 pr-3 leading-relaxed text-muted-foreground">{t.cause}</td>
                <td className="py-3 leading-relaxed text-muted-foreground">
                  {t.fix}
                  {/* Где чинить — отдельной строкой: половина бед лечится не здесь, и
                      человек должен понимать это до того, как начнёт искать на экране. */}
                  {/* ✗ ЗДЕСЬ СТОЯЛО `text-muted-foreground/70`, и гейт контраста был прав:
                      доля от токена — это цвет, которого нет в палитре, и его читаемость
                      никто не мерил. Нужен был вид «потише основного» — но берётся он
                      РАЗМЕРОМ и разрядкой, а не прозрачностью. */}
                  <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t.where}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Small className="mt-4 block max-w-3xl text-muted-foreground">{ui.footnote}</Small>
    </section>
  )
}
