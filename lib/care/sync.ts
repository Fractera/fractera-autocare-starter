import "server-only"
import { db } from "@/lib/db"
import { idTail } from "@/lib/ids"
import { normalizePhone } from "./phone"
import { fetchAllClients, fetchAllRecords, type YclientsRecord } from "./yclients"

// ПЕРЕНОС ДАННЫХ CRM В ТАБЛИЦЫ ПРОДУКТА.
//
// Читает YCLIENTS и раскладывает ответ по своим таблицам. В CRM не пишет ничего:
// она источник правды о визитах, а не наша база.
//
// 🔒 ИДЕМПОТЕНТНОСТЬ — ГЛАВНОЕ СВОЙСТВО ЭТОГО ФАЙЛА. Прогон повторяют: после
// сбоя сети, после правки разбора, по расписанию. Второй прогон обязан оставить
// базу ровно такой же. Держится это не на проверках в коде, а на ЕСТЕСТВЕННЫХ
// ключах схемы — телефон у человека, «запись CRM + услуга» у визита — и на
// `ON CONFLICT`, который обновляет вместо вставки.
//
// ✗ Класс дефекта записан в ANTI-PATTERNS: «случайный id обходит защиту от
// повтора». Здесь id тоже случайный, но защита стоит НЕ на нём.
//
// 🔒 ЗАПИСЬ ПАЧКАМИ, А НЕ ПО СТРОКЕ — И ЭТО НЕ ОПТИМИЗАЦИЯ, А УСЛОВИЕ РАБОТЫ.
// В слое данных каждый `prepare().run()` — отдельный HTTP-запрос
// (`lib/db/remote-client.ts`). Филиал даёт около двух тысяч людей и шести тысяч
// строк визитов: построчная запись означала бы восемь тысяч обращений по сети и
// минуты ожидания. ✗ Ровно на этом обжёгся исходник, и его автор записал вывод
// прямо в коде: «500 отдельных INSERT по HTTP-драйверу заняли бы минуты».
//
// Значения едут ПАРАМЕТРАМИ, а не склейкой в текст запроса: имена и комментарии
// приходят из чужой системы, и склейка означала бы внедрение SQL.

export type SyncReport = {
  clients: number
  records: number
  peopleInserted: number
  peopleUpdated: number
  visitRows: number
  services: number
  skippedNoPhone: number
  /**
   * Сколько карточек CRM схлопнулось в уже занятого человека по телефону.
   *
   * 🔒 БЕЗ ЭТОГО ЧИСЛА ОТЧЁТ НЕ СХОДИТСЯ С CRM, И РАСХОЖДЕНИЕ ВЫГЛЯДИТ ПОТЕРЕЙ.
   * Живой филиал 2026-08-25: CRM отдала 1849 карточек, в `care_people` легло
   * 1844. Разница — 4 без телефона и ОДНА пара карточек на одного человека с
   * одним номером. Схлопывание правильное (человек один), но молчащее: сверить
   * приёмку без этого счётчика можно только сторонним скриптом.
   */
  mergedByPhone: number
  /**
   * У скольких карточек CRM ПРИШЛО поле согласия (`sms_not`).
   *
   * 🔒 НОЛЬ ЗДЕСЬ ОЗНАЧАЕТ «НЕ ИЗМЕРЕНО», А НЕ «ВСЕ СОГЛАСНЫ» — И РАЗНИЦА
   * СТОИТ ДОРОГО. ✗ Найдено 2026-08-25: YCLIENTS на наш список `fields`
   * возвращает только `id, name, surname, phone, email`, молча выбрасывая
   * `sms_not`. Согласие вычисляется как `sms_not ? 0 : 1`, поэтому у КАЖДОГО
   * выходит единица, и экран аудита показал бы «отказников 0» как измеренный
   * факт. Продукт существует, чтобы писать людям: он написал бы и тем, кто
   * отказался.
   */
  consentKnown: number
  /**
   * У скольких карточек CRM пришла дата рождения.
   *
   * 🔒 ТОТ ЖЕ ОТКАЗ, ЧТО У СОГЛАСИЯ. Ноль означает, что тип триггера `birthday`
   * из `care_scenarios` не сможет сработать ни разу — и это надо видеть на
   * экране, а не выяснять по молчащей цепочке через полгода.
   */
  birthdayKnown: number
}

/** Сколько строк класть в один запрос. Ограничение — число параметров на запрос. */
const CHUNK = 100

/** Разбивка на пачки: одна пачка — один запрос к базе. */
function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Окно записей: два года назад и 90 дней вперёд, как в исходнике. */
function window(): { start: string; end: string } {
  const start = new Date()
  start.setFullYear(start.getFullYear() - 2)
  const end = new Date()
  end.setDate(end.getDate() + 90)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}

type Derived = { lastVisit?: string; nextVisit?: string; success?: number; fail?: number; isNew?: number; spent: number }

/**
 * Что выводится из записей: даты визитов, счётчики, потраченное.
 *
 * 🔒 ПОСЛЕДНИМ ВИЗИТОМ СЧИТАЕТСЯ ТОЛЬКО СОСТОЯВШИЙСЯ (`attendance === 1`).
 * Неявка — не визит; человек, трижды не пришедший, по датам выглядел бы активным,
 * а по сути потерян.
 */
function derive(records: YclientsRecord[], today: string): Map<number, Derived> {
  const out = new Map<number, Derived>()
  for (const r of records) {
    const cid = r.client?.id
    if (!cid) continue
    const date = (r.date ?? "").slice(0, 10)
    if (!date) continue
    const d = out.get(cid) ?? { spent: 0 }
    if (date <= today && r.attendance === 1 && (!d.lastVisit || date > d.lastVisit)) d.lastVisit = date
    if (date > today && (!d.nextVisit || date < d.nextVisit)) d.nextVisit = date
    if (typeof r.client?.success_visits_count === "number") d.success = r.client.success_visits_count
    if (typeof r.client?.fail_visits_count === "number") d.fail = r.client.fail_visits_count
    if (typeof r.client?.is_new === "boolean") d.isNew = r.client.is_new ? 1 : 0
    for (const s of r.services ?? []) d.spent += Number(s.cost) || 0
    out.set(cid, d)
  }
  return out
}

/** Полный перенос: клиенты и визиты филиала в таблицы продукта. */
export async function syncFromCrm(): Promise<SyncReport> {
  const today = new Date().toISOString().slice(0, 10)
  const { start, end } = window()

  const clients = await fetchAllClients()
  const records = await fetchAllRecords(start, end)
  const derived = derive(records, today)

  const report: SyncReport = {
    clients: clients.length,
    records: records.length,
    peopleInserted: 0,
    peopleUpdated: 0,
    visitRows: 0,
    services: 0,
    skippedNoPhone: 0,
    mergedByPhone: 0,
    consentKnown: 0,
    birthdayKnown: 0,
  }

  /** Телефоны, уже занятые в ЭТОМ прогоне: по ним и ловится схлопывание. */
  const seenThisRun = new Set<string>()

  // Кто уже есть — читается ОДНИМ запросом. Иначе на каждого человека приходился
  // бы поход в базу, и обход двух тысяч клиентов сам стал бы двумя тысячами
  // запросов ещё до первой записи.
  const existing = (await db.prepare("SELECT id, phone FROM care_people").all()) as unknown as {
    id: string
    phone: string
  }[]
  const idByPhone = new Map(existing.map(r => [r.phone, r.id]))

  const peopleRows: unknown[][] = []
  const caseRows: unknown[][] = []
  /** Клиент CRM → наш `person_id`. Нужен, чтобы привязать визиты. */
  const personByCrmId = new Map<number, string>()

  for (const c of clients) {
    const phone = normalizePhone(c.phone)
    if (!phone) {
      // 🔒 ЧЕЛОВЕК БЕЗ ТЕЛЕФОНА ПРОПУСКАЕТСЯ, И ЭТО СЧИТАЕТСЯ. Телефон — и ключ
      // уникальности, и единственный способ до него достучаться. Пропустить молча
      // нельзя: число попадает в отчёт.
      report.skippedNoPhone++
      continue
    }
    // 🔒 ВТОРАЯ КАРТОЧКА CRM НА ТОТ ЖЕ НОМЕР — ЭТО ОДИН ЧЕЛОВЕК, И ЭТО СЧИТАЕТСЯ.
    // Человек один, строка одна — так и надо. Но `ON CONFLICT` перезапишет дело
    // первой карточки делом второй, и один `yclients_client_id` пропадёт молча.
    // Число попадает в отчёт по тому же закону, что и пропуск без телефона.
    if (seenThisRun.has(phone)) report.mergedByPhone++
    seenThisRun.add(phone)

    const known = idByPhone.get(phone)
    const personId = known ?? `p-${idTail()}`
    if (known) report.peopleUpdated++
    else { report.peopleInserted++; idByPhone.set(phone, personId) }
    personByCrmId.set(c.id, personId)

    // Считается ПРИСУТСТВИЕ поля, а не его значение: пришедший ноль — это
    // измеренное «слать можно», а не пришедшее поле — отсутствие измерения.
    if (c.sms_not !== undefined && c.sms_not !== null) report.consentKnown++
    if (c.birth_date) report.birthdayKnown++

    const fullName = [c.surname, c.name].filter(Boolean).join(" ").trim() || "Без имени"
    // `sms_not` в CRM означает «не слать» — наше поле обратно по смыслу.
    peopleRows.push([personId, fullName, phone, c.email ?? null, c.birth_date ?? null, c.sms_not ? 0 : 1])

    const d = derived.get(c.id)
    caseRows.push([
      personId, String(c.id),
      d?.lastVisit ?? null, d?.nextVisit ?? null,
      d?.success ?? null, d?.fail ?? null, d?.isNew ?? null, d?.spent ?? null,
    ])
  }

  // 🔒 СОГЛАСИЕ ПРИ ОБНОВЛЕНИИ НЕ ТРОГАЕТСЯ. Его мог снять оператор здесь, у нас,
  // и перезапись значением из CRM вернула бы человека в рассылку против его слова.
  for (const batch of chunks(peopleRows)) {
    const values = batch.map(() => "(?,?,?,?,?,?)").join(",")
    await db
      .prepare(
        `INSERT INTO care_people (id, full_name, phone, email, birth_date, consent_to_contact)
         VALUES ${values}
         ON CONFLICT(phone) DO UPDATE SET
           full_name  = excluded.full_name,
           email      = COALESCE(excluded.email, care_people.email),
           birth_date = COALESCE(excluded.birth_date, care_people.birth_date),
           updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
      )
      .run(...batch.flat())
  }

  for (const batch of chunks(caseRows)) {
    const values = batch.map(() => "(?,?,?,?,?,?,?,?)").join(",")
    await db
      .prepare(
        `INSERT INTO care_cases
           (person_id, yclients_client_id, last_visit_date, next_visit_date,
            visits_success_count, visits_fail_count, is_new_client, lifetime_spent)
         VALUES ${values}
         ON CONFLICT(person_id) DO UPDATE SET
           yclients_client_id   = excluded.yclients_client_id,
           last_visit_date      = excluded.last_visit_date,
           next_visit_date      = excluded.next_visit_date,
           visits_success_count = excluded.visits_success_count,
           visits_fail_count    = excluded.visits_fail_count,
           is_new_client        = excluded.is_new_client,
           lifetime_spent       = excluded.lifetime_spent,
           updated_at           = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
      )
      .run(...batch.flat())
  }

  // 🔒 СТРОКА ВИЗИТА = ОДНА УСЛУГА. Запись CRM с тремя услугами даёт три строки:
  // именно так считаются выручка, средний чек и циклы повтора. Свернуть их в одну
  // значило бы потерять всё, ради чего эта таблица существует.
  //
  // 🔒 БЕЗ УСЛУГИ ПИШЕТСЯ ПУСТАЯ СТРОКА, А НЕ `NULL`, И ЭТО УСЛОВИЕ ИДЕМПОТЕНТНОСТИ.
  // ✗ Оплачено живым прогоном 2026-08-25: в SQLite `NULL` не равен `NULL` даже
  // самому себе, поэтому `UNIQUE (yclients_record_id, service_title)` на паре с
  // пустой колонкой НЕ СРАБАТЫВАЕТ — `ON CONFLICT` не видит конфликта и вставляет
  // ещё одну строку. Второй прогон удвоил ровно беститульные визиты: 2123 записи
  // CRM стали 4246 строками. Отчёт об этом молчал, потому что считает отправленное,
  // а не легшее. Пустая строка — обычное значение, и ключ на ней работает.
  const visitRows: unknown[][] = []
  for (const r of records) {
    const date = (r.date ?? "").slice(0, 10)
    if (!date) continue
    const personId = r.client?.id ? personByCrmId.get(r.client.id) ?? null : null
    const services = (r.services ?? []).length
      ? r.services!
      : [{ title: "", cost: null as number | null }]
    for (const s of services) {
      // Пробелы по краям срезаются: «Осмотр» и «Осмотр » — одна услуга, а для
      // ключа и для каталога протоколов это были бы две разные.
      const title = (s.title ?? "").trim()
      visitRows.push([
        `v-${idTail()}`, personId, String(r.id), date,
        r.attendance ?? null, r.staff?.name ?? null,
        title, typeof s.cost === "number" ? s.cost : null,
      ])
    }
  }
  for (const batch of chunks(visitRows)) {
    const values = batch.map(() => "(?,?,?,?,?,?,?,?)").join(",")
    await db
      .prepare(
        `INSERT INTO care_visits
           (id, person_id, yclients_record_id, visit_date, attendance, staff_name, service_title, service_cost)
         VALUES ${values}
         ON CONFLICT(yclients_record_id, service_title) DO UPDATE SET
           person_id    = excluded.person_id,
           visit_date   = excluded.visit_date,
           attendance   = excluded.attendance,
           staff_name   = excluded.staff_name,
           service_cost = excluded.service_cost`,
      )
      .run(...batch.flat())
    report.visitRows += batch.length
  }

  // Каталог услуг заполняется из того, что реально оказывали: отдельного списка
  // услуг у нас нет, а протоколы врачи пишут именно к этим строкам.
  const before = (await db.prepare("SELECT COUNT(*) AS n FROM care_service_protocols").get()) as { n: number }
  await db
    .prepare(
      `INSERT INTO care_service_protocols (id, service_title)
       SELECT 'sp-' || substr(hex(randomblob(8)), 1, 12), service_title
         FROM care_visits
        WHERE COALESCE(service_title,'') <> ''
          AND service_title NOT IN (SELECT service_title FROM care_service_protocols)
        GROUP BY service_title`,
    )
    .run()
  const after = (await db.prepare("SELECT COUNT(*) AS n FROM care_service_protocols").get()) as { n: number }
  report.services = Number(after.n) - Number(before.n)

  return report
}

/**
 * Записать прогон в журнал.
 *
 * 🔒 БЕЗ ЭТОЙ ЗАПИСИ ЭКРАН АУДИТА НЕВОЗМОЖЕН. Часть чисел — свойства ПРОГОНА, а
 * не базы: сколько карточек CRM пропущено без телефона и сколько схлопнулось по
 * телефону. В таблицах этих людей нет по определению, и вычислить их задним
 * числом нельзя — можно только помнить. ✗ Без журнала расхождение «CRM отдаёт
 * 1849, у нас 1844» пришлось бы каждый раз выяснять сторонним скриптом, как это
 * и было 2026-08-25.
 *
 * 🔒 ЖУРНАЛ, А НЕ НОВАЯ ТАБЛИЦА. `care_activity_log` заведён шагом 10 ровно под
 * «кто и что сделал»; прогон синхронизации — такое же действие, как правка
 * карточки, и заводить ему отдельный склад значило бы делить один журнал надвое.
 *
 * 🔒 ОШИБКА ЗАПИСИ НЕ ВАЛИТ ПРОГОН. Данные уже перенесены; потерять их из-за
 * неудачной строки журнала было бы дороже, чем потерять саму строку. Отказ
 * возвращается вызывающему, чтобы он мог сказать о нём вслух.
 */
export async function logSyncRun(actor: string, report: SyncReport): Promise<string | null> {
  try {
    await db
      .prepare(
        `INSERT INTO care_activity_log (id, actor, action, metadata) VALUES (?,?,?,?)`,
      )
      .run(`al-${idTail()}`, actor, "crm_sync", JSON.stringify(report))
    return null
  } catch (e) {
    return String((e as Error).message ?? e)
  }
}
