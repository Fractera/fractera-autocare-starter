import { blocksToMarkdown, faqToMarkdown } from './blocks-to-markdown'
import { urlFor, mdUrlFor } from '@/lib/seo/alternates'
import { getAppConfig, metaForLang } from '@/config/app-config'
import { footerPage } from '@/lib/pages/footer-page'
import { data as privacyData } from '@/app/[lang]/(publicLayer)/(footerPages)/privacy/_data'
import { data as termsData } from '@/app/[lang]/(publicLayer)/(footerPages)/terms/_data'
import { data as cookiesData } from '@/app/[lang]/(publicLayer)/(footerPages)/cookies/_data'
import { data as architectureData } from '@/app/[lang]/(publicLayer)/(footerPages)/architecture/_data'
import { data as accessibilityData } from '@/app/[lang]/(publicLayer)/(footerPages)/accessibility/_data'

// ПЕРЕЧЕНЬ ПУБЛИЧНЫХ ПОВЕРХНОСТЕЙ — ОДИН НА ВЕСЬ AIO (шаг 505).
//
// Отсюда берут содержимое три вещи: `llms.txt` (карта), `llms-full.txt` (полные
// тексты) и markdown-версия каждой страницы. Один перечень означает, что новая
// страница появляется во всех трёх сразу либо не появляется нигде — расхождение
// между картой и сайтом физически невозможно.
//
// 🔒 ЗДЕСЬ ТОЛЬКО ПУБЛИЧНОЕ. Страницы за ролью (`(protectedLayer)`) в перечень не
// входят и входить не могут: карта для ИИ — это приглашение прочитать, а
// закрытые адреса приглашать нельзя. Проверка `check:aio` следит за этим.
//
// Товары в перечне отсутствуют НАМЕРЕННО: их множество растёт в рантайме и
// умножается на языки. Карта называет каталог; сами карточки индексируются
// картой сайта и имеют собственные markdown-версии по своему адресу. Тот же урок,
// что с `sitemap.xml`: файл, выросший до предела, перестаёт работать целиком.

export type Surface = {
  /** Путь без языка: '' — главная, '/blog' — раздел. */
  subPath: string
  title: string
  description: string
  /** Раздел карты, в который попадает ссылка. */
  section: 'main' | 'articles' | 'legal'
  /** Полный текст в markdown — считается лениво, он нужен не всем читателям. */
  body: () => string
}

// Адрес markdown-версии живёт рядом с построением остальных адресов
// (`lib/seo/alternates.ts`) — там же, где `urlFor`, чтобы одноязычный режим
// учитывался ровно один раз. Здесь он только переэкспортируется для читателей
// этого модуля.
export { mdUrlFor }

export function publicSurfaces(lang: string): Surface[] {
  const cfg = getAppConfig()
  const home = metaForLang(lang)

  const surfaces: Surface[] = [
    {
      subPath: '',
      // Имя сайта, а не заголовок страницы: последний пропущен через шаблон
      // (`%s | Сайт`) и в карте читался бы как имя, повторённое дважды.
      title: home.siteName,
      description: home.description,
      section: 'main',
      // У главной нет собственного текста в блоках: её содержимое — это
      // идентичность проекта из настроек. Честнее отдать её как описание с
      // перечнем разделов, чем выдумать текст, которого на странице нет.
      // 🔒 БЕЗ СЛУЖЕБНЫХ ПОДПИСЕЙ НА ЧУЖОМ ЯЗЫКЕ (шаг 507). Здесь стояла строка
      // «- Сайт: <адрес>», и английская главная отдавала машинному читателю
      // русское слово. Словаря у этой поверхности нет и заводить его не за чем:
      // адрес сайта — не подпись, а ссылка, и она уже стоит в карте `llms.txt`.
      body: () =>
        [`# ${home.siteName}`, '', `> ${home.description}`, ...(cfg.url ? ['', cfg.url] : [])].join('\n'),
    },
  ]

  // 🔒 ПОВЕРХНОСТИ БЛОГА И ТОВАРОВ СНЯТЫ (шаг 8). Обе пришли из шаблона и в
  // утверждённое дерево не вошли; страницы удалены, и карта для машинных
  // читателей не должна обещать того, чего нет.

  for (const [data, sub] of [
    [privacyData, '/privacy'],
    [termsData, '/terms'],
    [cookiesData, '/cookies'],
    // Заявление о доступности — документ того же рода, что правовые: короткий
    // текст о свойствах сайта, который читатель ищет в подвале. Раздел карты у
    // него 'legal' по той же причине.
    [accessibilityData, '/accessibility'],
    // «О нас» собрана теми же языковыми ячейками, что правовые страницы, поэтому
    // идёт тем же циклом. Раздел карты — 'main', а не 'legal': это рассказ о
    // компании, за которым приходят, а не справочный документ, и в списке
    // правовых машинный читатель искал бы его последним.
    // Архитектура живёт в той же папке и по тем же законам, что правовые
    // страницы, поэтому идёт тем же циклом. Раздел карты у неё, однако, 'main':
    // это описание продукта, а не документ, и в списке правовых читатель искал бы
    // его последним.
    [architectureData, '/architecture'],
  ] as const) {
    const page = footerPage(data as never, lang)
    surfaces.push({
      subPath: sub,
      title: page.title,
      description: page.description,
      section: sub === '/architecture' ? 'main' : 'legal',
      body: () =>
        [`# ${page.title}`, '', `> ${page.description}`, '', blocksToMarkdown(page.blocks, home.siteName)].join('\n').trim(),
    })
  }

  return surfaces
}

export function surfaceFor(lang: string, subPath: string): Surface | undefined {
  return publicSurfaces(lang).find(s => s.subPath === subPath)
}
