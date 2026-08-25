import "server-only"
import { db } from "@/lib/db"
import { idTail } from "@/lib/ids"
import { fetchAllClients, fetchClientCard } from "./yclients"

// СБОР НАСТОЯЩЕГО СОГЛАСИЯ НА СВЯЗЬ.
//
// 🔒 ОТДЕЛЬНЫЙ ПРОХОД, А НЕ ЧАСТЬ СИНХРОНИЗАЦИИ — решение владельца 2026-08-25.
// Согласие лежит ТОЛЬКО в карточке одного клиента (`client_agreements`): в
// оптовом маршруте этого поля нет. Значит обход стоит 1849 запросов и около
// пятнадцати минут против сорока пяти секунд у синхронизации. Согласие меняется
// редко — тянуть его каждый раз значит платить четверть часа за неизменившееся,
// и тогда таймерная цепочка ждала бы этот квадрант часа.
//
// 🔒 ЧТО ЗДЕСЬ МЕРЯЕТСЯ, А ЧТО РЕШЕНО ВЛАДЕЛЬЦЕМ. Разведка 13-1 на выборке в сто
// карточек: у 22% запись согласия ЕСТЬ, и у всех до одной стоит
// `is_newsletter_allowed: false`. Разрешений не встретилось ни одного. У
// остальных 78% записи нет вовсе.
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА (2026-08-25, дословно): «Считать разрешением».
// Отсутствие записи = можно писать. Я возражал: явные отказы в базе есть,
// значит клиника согласия собирает, просто не у всех, — и молчание может
// означать «не спрашивали», а не «разрешил». Возражение отклонено, решение
// принято владельцем. Записано здесь, чтобы следующая сессия не переиграла его
// молча.
//
// ✗ СТАРЫЕ ФЛАГИ CRM МЕРТВЫ В ЭТОМ УЧРЕЖДЕНИИ: `sms_not`, `sms_check`,
// `sms_bot` равны нулю у всех 1849. Ноль в них означает «никто не трогал», а не
// «человек разрешил», и строить согласие на них нельзя.

export type ConsentReport = {
  /** Сколько карточек опрошено. */
  checked: number
  /** Скольких не удалось прочитать: карточка не ответила. */
  unreadable: number
  /** У скольких запись согласия ЕСТЬ. */
  withAgreement: number
  /** Из них: рассылка прямо запрещена. */
  refused: number
  /** Из них: рассылка прямо разрешена. */
  allowed: number
  /** Записи нет вовсе. По решению владельца считаются разрешением. */
  noRecord: number
  /** Скольким строкам согласие поменяли. */
  changed: number
  seconds: number
}

const CHUNK = 100

function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Обойти карточки и записать согласие.
 *
 * 🔒 ПИШЕТСЯ ТОЛЬКО ЭТА КОЛОНКА И ТОЛЬКО ОТСЮДА. Синхронизация согласие не
 * трогает (закон шага 11: его мог снять оператор у нас, и перезапись значением
 * из CRM вернула бы человека в рассылку против его слова). Здесь наоборот:
 * источник правды — письменное согласие в CRM, и оно старше нашей колонки.
 */
export async function syncConsent(onProgress?: (done: number, total: number) => void): Promise<ConsentReport> {
  const t0 = Date.now()
  const clients = await fetchAllClients()

  const report: ConsentReport = {
    checked: 0, unreadable: 0, withAgreement: 0,
    refused: 0, allowed: 0, noRecord: 0, changed: 0, seconds: 0,
  }

  // Кто у нас есть и что у него сейчас стоит — ОДНИМ запросом. Иначе обход
  // ходил бы в базу на каждую карточку и удвоил бы и без того долгий проход.
  const known = (await db
    .prepare(
      `SELECT c.yclients_client_id AS crm, c.person_id AS pid, p.consent_to_contact AS now
         FROM care_cases c JOIN care_people p ON p.id = c.person_id
        WHERE c.yclients_client_id IS NOT NULL`,
    )
    .all()) as unknown as { crm: string; pid: string; now: number }[]
  const personByCrmId = new Map(known.map(r => [String(r.crm), r.pid]))
  const consentNow = new Map(known.map(r => [r.pid, Number(r.now)]))

  // Два списка вместо пар: обновление пишется двумя запросами на пачку, а не
  // ветвлением внутри одного.
  const toRefuse: string[] = []
  const toAllow: string[] = []

  for (const c of clients) {
    const personId = personByCrmId.get(String(c.id))
    // Карточка, которой нет у нас, — это пропущенный без телефона или схлопнутый
    // по телефону. Спрашивать за неё согласие незачем: писать всё равно некому.
    if (!personId) continue

    const card = await fetchClientCard(c.id)
    report.checked++
    if (!card) { report.unreadable++; continue }

    const a = card.client_agreements
    const hasRecord = Boolean(a && Object.keys(a).length)

    let consent: number
    if (hasRecord) {
      report.withAgreement++
      // 🔒 ЗАПРЕТ РЕШАЕТ ТОЛЬКО ЯВНОЕ `false`. `null` внутри записи означает «не
      // спрашивали по этому пункту», и приравнять его к отказу значило бы
      // выдумать отказ, которого человек не давал.
      if (a!.is_newsletter_allowed === false) { report.refused++; consent = 0 }
      else { if (a!.is_newsletter_allowed === true) report.allowed++; consent = 1 }
    } else {
      report.noRecord++
      consent = 1   // решение владельца 2026-08-25: отсутствие записи = разрешение
    }

    if (consentNow.get(personId) !== consent) report.changed++
    ;(consent ? toAllow : toRefuse).push(personId)
    onProgress?.(report.checked, clients.length)
  }

  // 🔒 ОБНОВЛЕНИЕ, А НЕ ВСТАВКА. Эти люди уже есть — их завела синхронизация.
  // Вставка с `ON CONFLICT` потребовала бы имени и телефона, которых у этого
  // прохода нет: он читает согласие, а не личность, и выдумывать недостающие
  // колонки ради формы запроса значило бы затереть настоящие.
  //
  // Запись пачками: в слое данных каждый запрос — отдельный HTTP-вызов.
  const write = async (ids: string[], value: number) => {
    for (const batch of chunks(ids)) {
      const holes = batch.map(() => "?").join(",")
      await db
        .prepare(
          `UPDATE care_people
              SET consent_to_contact = ${value},
                  updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
            WHERE id IN (${holes})`,
        )
        .run(...batch)
    }
  }
  await write(toRefuse, 0)
  await write(toAllow, 1)

  report.seconds = Math.round((Date.now() - t0) / 1000)
  return report
}

/** Записать проход в журнал — тем же способом, что и синхронизацию. */
export async function logConsentRun(actor: string, report: ConsentReport): Promise<string | null> {
  try {
    await db
      .prepare(`INSERT INTO care_activity_log (id, actor, action, metadata) VALUES (?,?,?,?)`)
      .run(`al-${idTail()}`, actor, "crm_consent", JSON.stringify(report))
    return null
  } catch (e) {
    return String((e as Error).message ?? e)
  }
}
