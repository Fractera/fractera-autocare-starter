import { administrationUsersUi } from "@/app/[lang]/(protectedLayer)/(admin)/administration/users/_data/ui.i18n"
import { cabinetUi } from "@/app/[lang]/(protectedLayer)/(account)/cabinet/_data/ui.i18n"
import { dashboardUi } from "@/app/[lang]/(protectedLayer)/(staff)/dashboard/_data/ui.i18n"
import { tasksUi } from "@/app/[lang]/(protectedLayer)/(staff)/tasks/_data/ui.i18n"
import { patientsUi } from "@/app/[lang]/(protectedLayer)/(staff)/patients/_data/ui.i18n"
import { messagesUi } from "@/app/[lang]/(protectedLayer)/(staff)/messages/_data/ui.i18n"
import { scenariosUi } from "@/app/[lang]/(protectedLayer)/(staff)/scenarios/_data/ui.i18n"
import { servicesUi } from "@/app/[lang]/(protectedLayer)/(staff)/services/_data/ui.i18n"
import { analyticsUi } from "@/app/[lang]/(protectedLayer)/(staff)/analytics/_data/ui.i18n"
import { auditUi } from "@/app/[lang]/(protectedLayer)/(staff)/audit/_data/ui.i18n"
import { clientsUi } from "@/app/[lang]/(protectedLayer)/(staff)/clients/_data/ui.i18n"
import { companyUi } from "@/app/[lang]/(protectedLayer)/(admin)/company/_data/ui.i18n"
import type { DrawerLink } from "@/components/menu/account/account-drawer.client"

// РАБОЧИЕ РАЗДЕЛЫ, которые ящик аккаунта показывает вошедшему.
//
// Здесь, а не в самом ящике: ящик — переиспользуемая часть продукта на 82 языках,
// а этот список — страницы КОНКРЕТНОГО проекта. Клиент, которому товары не нужны,
// удаляет строку отсюда и не трогает общий компонент.
//
// 🔒 ЗАЧЕМ ЭТО ВООБЩЕ ПОЯВИЛОСЬ. Страница менеджера существовала с самого начала и
// не была связана НИ ОДНОЙ ссылкой: попасть в неё можно было, только набрав адрес
// руками. Менеджер, вошедший под своей ролью, свою же таблицу не находил. Дефект
// обнаружился, когда публичная витрина заняла адрес `/[lang]/products` и страница
// переехала в `/[lang]/manage/products`: старый адрес молча стал открывать витрину.
//
// 🔒 ПУНКТ НАЗЫВАЕТ СВОЙ СЛОЙ, А НЕ СПИСОК РОЛЕЙ. Роли слоя знает `lib/roles.ts`,
// и ящик спрашивает их там же — поэтому пункт физически не может разойтись с
// дверью, которую открывает. Перечисли роли здесь копией, и однажды пункт начнёт
// либо дразнить отказом, либо прятать доступное.
//
// Видимость — вежливость, а не защита: замок стоит на самой странице
// (`layout.tsx` подгруппы) и в маршрутах данных.
//
// 🔒 ЭТОТ ФАЙЛ — ЕДИНСТВЕННОЕ МЕСТО, КОТОРОМУ ПОЗВОЛЕНО ЗНАТЬ ПРО СТРАНИЦЫ РАЗНЫХ
// ГРУПП. Он и существует ради этого: собрать меню из того, что построено. Сами
// группы друг о друге по-прежнему не знают ничего.
//
// Слова каждого пункта живут при своей странице (её `_data/ui.i18n.ts`), а не в
// словаре ящика: это строка одной страницы, и языков у неё столько же, сколько у
// страницы, — не 82 впрок.
export function accountLinks(lang: string): DrawerLink[] {
  return [
    { href: `/${lang}/administration/users`, label: administrationUsersUi(lang).title, group: "admin" },
    // ── СКЕЛЕТ ШАГА 7 ─────────────────────────────────────────────────────
    // Маршруты утверждённого дерева. Пока заглушки: владелец должен ходить по
    // дереву обычной навигацией, а не набирать адреса руками — ровно тот дефект,
    // ради которого этот файл и появился (см. шапку).
    { href: `/${lang}/cabinet`, label: cabinetUi(lang).title, group: "account" },
    { href: `/${lang}/dashboard`, label: dashboardUi(lang).title, group: "staff" },
    { href: `/${lang}/tasks`, label: tasksUi(lang).title, group: "staff" },
    { href: `/${lang}/patients`, label: patientsUi(lang).title, group: "staff" },
    { href: `/${lang}/messages`, label: messagesUi(lang).title, group: "staff" },
    { href: `/${lang}/scenarios`, label: scenariosUi(lang).title, group: "staff" },
    { href: `/${lang}/services`, label: servicesUi(lang).title, group: "staff" },
    { href: `/${lang}/analytics`, label: analyticsUi(lang).title, group: "staff" },
    { href: `/${lang}/audit`, label: auditUi(lang).title, group: "staff" },
    { href: `/${lang}/clients`, label: clientsUi(lang).title, group: "staff" },
    { href: `/${lang}/company`, label: companyUi(lang).title, group: "admin" },
  ]
}
