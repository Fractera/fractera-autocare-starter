import Link from "next/link"
import { UserPlus } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Small } from "@/components/ui/typography"
import { homeCtaUi } from "./cta.i18n"
import { HomeCtaByRole } from "./cta.client"

// КНОПКА «СТАТЬ КЛИЕНТОМ» внизу главной — заказ Ромы 2026-08-25: «в случае если
// пользователь не зарегистрирован, то эта кнопка ведёт на форму регистрации или
// авторизации».
//
// 🔒 ОДНА ДВЕРЬ НА ВХОД И НА РЕГИСТРАЦИЮ, И ЭТО НЕ УПРОЩЕНИЕ. Регистрация живёт в службе
// авторизации на ДРУГОМ домене, и она же встречает того, у кого учётной записи ещё нет:
// решение «войти или завести» принимает служба, а не наша страница. Вести на `/register`
// напрямую значило бы решать за человека, который, может быть, уже зарегистрирован.
//
// 🔒 `prefetch={false}` ОБЯЗАТЕЛЕН — тот же закон, что у кнопки входа в шапке и подвале
// (оплачен дважды: 2026-08-13). Next заранее тянет видимые ссылки, `/login` уводит
// переадресацией на чужой домен, браузер видит запрос через границу источника и пишет
// ошибку CORS в консоль НА КАЖДОЙ странице сайта. Посетитель при этом не страдает, но в
// отчёте проверки это «ошибки в консоли» — первое, что видит владелец.
//
// 🔒 СЕРВЕРНЫЙ КОМПОНЕНТ, БЕЗ ОСТРОВКА. Кнопка ничего не спрашивает у браузера: она
// одинакова для всех, потому что решение «войти или зарегистрироваться» принимается не
// здесь. Островок ради ссылки — это JavaScript в обмен ни на что.
// 🔒 СЕРВЕР ПЕЧАТАЕТ ГОСТЕВОЙ ВАРИАНТ, ОСТРОВОК ПОДМЕНЯЕТ ЕГО ПО РОЛИ (шаг 28).
// Страница статическая, и роль на сборке неизвестна; гостевая кнопка верна для всех, кто
// не вошёл, и служит близнецом на тот миг, пока островок спрашивает дверь «кто я».
export function HomeCta({ lang }: { lang: string }) {
  const t = homeCtaUi(lang)
  return <HomeCtaByRole lang={lang} ui={t} guest={<GuestCta lang={lang} t={t} />} />
}

function GuestCta({ lang, t }: { lang: string; t: ReturnType<typeof homeCtaUi> }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-2">
      <Link
        href={`/login?lang=${lang}`}
        prefetch={false}
        className={buttonVariants({ size: "lg" }) + " gap-2"}
      >
        <UserPlus className="size-4" />
        {t.become}
      </Link>
      <Small className="text-muted-foreground">{t.hint}</Small>
    </div>
  )
}
