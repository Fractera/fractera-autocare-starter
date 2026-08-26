import { Badge } from "@/components/ui/badge"
import { H1 } from "@/components/ui/typography"
import { ShimmerSwap } from "./swap.client"

// ЗАГОЛОВОК ГЛАВНОЙ: имя компании бейджем НАД именем продукта, само имя — мерцающее.
// Заказ Ромы 2026-08-25.

/**
 * Близнец покоя. 🔒 Это обычный `H1` примитива: без JavaScript и до гидратации на экране
 * стоит настоящий заголовок в цвете темы, а не прозрачные буквы.
 */
export function TitleTwin({ text }: { text: string }) {
  return <H1>{text}</H1>
}

/** Заголовок целиком: близнец + подмена мерцающей версией уже в браузере. */
export function ShimmerTitleBlock({ text }: { text: string }) {
  return (
    <ShimmerSwap text={text}>
      <TitleTwin text={text} />
    </ShimmerSwap>
  )
}

/**
 * Бейдж имени компании.
 *
 * 🔒 РАНЬШЕ ЭТО БЫЛА СТРОКА АВТОРА ПОД ЗАГОЛОВКОМ, и Рома попросил поднять её наверх и
 * сделать бейджем. Разница не в оформлении: под заголовком имя читалось как подпись «кто
 * это написал», над заголовком — как «чей это продукт». Второе и есть правда.
 */
export function CompanyBadge({ name }: { name: string }) {
  return <Badge variant="secondary" className="font-normal">{name}</Badge>
}
