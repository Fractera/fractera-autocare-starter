// @api pull clients and visits from the CRM into product tables
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { syncFromCrm } from "@/lib/care/sync"
import { fetchCompany } from "@/lib/care/yclients"

// СИНХРОНИЗАЦИЯ С CRM — единственная дверь, за которой данные филиала попадают
// в таблицы продукта.
//
// 🔒 ПРАВО АДМИНИСТРАТОРА, А НЕ МЕНЕДЖЕРА. Менеджер работает С данными; этот
// вызов их ПЕРЕЗАПИСЫВАЕТ целиком и стоит денег во внешнем лимите запросов.
// Право читать список и право перестроить его источник — разные способности.
//
// 🔒 ПОКА РУЧНАЯ. Таймер придёт шагом ядра: по замыслу владельца интеграция
// «по таймеру проверяет обновления», и это одна из двух часовых стрелок продукта.
// Заводить её здесь, до того как назначен механизм, значило бы выбрать его молча.
export const runtime = "nodejs"

// Ответ зависит от сессии и меняет базу — кэшировать нечего и незачем.
export const dynamic = "force-dynamic"

// 🔒 ОБХОД ФИЛИАЛА ИДЁТ МИНУТЫ, А НЕ СЕКУНДЫ. Две тысячи клиентов и шесть тысяч
// строк визитов забираются страницами по 200 с паузой 250 мс — этого требует лимит
// YCLIENTS. Предел маршрута поднят осознанно; уменьшить его можно только уменьшив
// окно дат, то есть потеряв историю.
export const maxDuration = 800

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.admin)
  if (denied) return denied

  // Проверка ключей до обхода: отказ на первой странице после трёх минут работы
  // выглядит как сбой сети, а не как «ключей нет».
  try {
    const company = await fetchCompany()
    const started = Date.now()
    const report = await syncFromCrm()
    return NextResponse.json({
      ok: true,
      company: { id: company.id, title: company.title, city: company.city },
      seconds: Math.round((Date.now() - started) / 1000),
      ...report,
    })
  } catch (e) {
    // 🔒 ПРИЧИНА НАЗЫВАЕТСЯ. Молчаливый отказ здесь неотличим от «в филиале нет
    // клиентов»: синхронизация отчиталась бы об успехе с нулём строк.
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 502 })
  }
}
