import "server-only"
import { db } from "@/lib/db"

// АНАЛИТИКА — цифры, по которым принимают решения.
//
// 🔒 ВСЁ СЧИТАЕТСЯ ИЗ `care_visits`, А НЕ ИЗ КОЛОНОК ДЕЛА. Это не осторожность:
// автор исходника записал цену ошибки прямо в своём коде — «раньше отчёт
// строился на 523 клиентах вместо 1627 реальных», потому что
// `patients.last_visit_date` заполнена у части карточек. Мы считаем по истории.
//
// 🔒 ИСКЛЮЧЁННЫЕ УСЛУГИ НЕ УЧАСТВУЮТ В ДЕНЬГАХ. Здесь флаг `excluded` каталога
// (шаг 16) получает своего потребителя. ✗ В исходнике он существовал и не
// использовался нигде — только красил строку бледным; флаг без потребителя это
// обещание, которого никто не сдержал.

/** Услуги, исключённые из счёта. Одно место, чтобы условие не разъехалось. */
const NOT_EXCLUDED = `
  COALESCE(v.service_title,'') NOT IN (
    SELECT service_title FROM care_service_protocols WHERE excluded = 1
  )`

export type CareAnalytics = {
  people: number
  peopleWithVisits: number
  /** У кого нет ни одной записи вперёд — это и есть риск потери. */
  noFutureBooking: number
  recency: { d0_30: number; d31_90: number; d91_180: number; d181_365: number; d365plus: number; never: number }
  attendance: { came: number; missed: number; unknown: number; missedShare: number | null }
  revenue: { total: number; visits: number; avgCheck: number; excludedRevenue: number }
  topServices: { title: string; visits: number; revenue: number }[]
  byStaff: { name: string; visits: number; revenue: number }[]
}

export async function careAnalytics(): Promise<CareAnalytics> {
  // 🔒 ОДИН ЗАПРОС НА ВСЕ СКАЛЯРЫ. Восемь отдельных дали бы восемь моментов
  // времени, и «людей всего» могло бы не сойтись с суммой корзин на том же
  // экране.
  // ✗ ЗДЕСЬ СТОЯЛ `WITH lv AS (...) SELECT ...`, И ОН МОЛЧА ВОЗВРАЩАЛ ПУСТО.
  // Слой данных на общем составном запросе с CTE не отдаёт ни строки и НЕ
  // сообщает об ошибке: экран показал бы аккуратные нули вместо 1844 человек и
  // трёх миллионов выручки, и объяснить это было бы нечем. Оплачено 2026-08-25.
  // Тот же смысл выражается производной таблицей в `FROM` — она работает.
  const head = (await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM care_people) AS people,
         COUNT(*)                                                                     AS peopleWithVisits,
         SUM(CASE WHEN lv.next_visit IS NULL THEN 1 ELSE 0 END)                        AS noFutureBooking,
         SUM(CASE WHEN lv.last_visit IS NOT NULL
                   AND julianday('now') - julianday(lv.last_visit) <= 30 THEN 1 ELSE 0 END)               AS d0_30,
         SUM(CASE WHEN lv.last_visit IS NOT NULL
                   AND julianday('now') - julianday(lv.last_visit) BETWEEN 31 AND 90 THEN 1 ELSE 0 END)   AS d31_90,
         SUM(CASE WHEN lv.last_visit IS NOT NULL
                   AND julianday('now') - julianday(lv.last_visit) BETWEEN 91 AND 180 THEN 1 ELSE 0 END)  AS d91_180,
         SUM(CASE WHEN lv.last_visit IS NOT NULL
                   AND julianday('now') - julianday(lv.last_visit) BETWEEN 181 AND 365 THEN 1 ELSE 0 END) AS d181_365,
         SUM(CASE WHEN lv.last_visit IS NOT NULL
                   AND julianday('now') - julianday(lv.last_visit) > 365 THEN 1 ELSE 0 END)               AS d365plus,
         SUM(CASE WHEN lv.last_visit IS NULL THEN 1 ELSE 0 END)                        AS neverVisited,
         (SELECT COUNT(*) FROM care_visits WHERE attendance = 1)                       AS came,
         (SELECT COUNT(*) FROM care_visits WHERE attendance = -1)                      AS missed,
         (SELECT COUNT(*) FROM care_visits WHERE attendance IN (0, 2) OR attendance IS NULL) AS unknownAtt,
         (SELECT COALESCE(SUM(v.service_cost),0) FROM care_visits v WHERE ${NOT_EXCLUDED}) AS revenue,
         (SELECT COUNT(DISTINCT v.yclients_record_id) FROM care_visits v WHERE ${NOT_EXCLUDED}) AS revVisits,
         (SELECT COALESCE(SUM(v.service_cost),0) FROM care_visits v WHERE NOT (${NOT_EXCLUDED})) AS excludedRevenue
       FROM (
         SELECT person_id,
                MAX(CASE WHEN visit_date <= date('now') AND attendance = 1 THEN visit_date END) AS last_visit,
                MIN(CASE WHEN visit_date >  date('now') THEN visit_date END)                    AS next_visit
           FROM care_visits WHERE person_id IS NOT NULL GROUP BY person_id
       ) lv`,
    )
    .get()) as Record<string, number> | undefined

  const n = (k: string) => Number(head?.[k] ?? 0)

  const top = (await db
    .prepare(
      `SELECT v.service_title AS title, COUNT(*) AS visits, COALESCE(SUM(v.service_cost),0) AS revenue
         FROM care_visits v
        WHERE COALESCE(v.service_title,'') <> '' AND ${NOT_EXCLUDED}
        GROUP BY v.service_title ORDER BY revenue DESC LIMIT 8`,
    )
    .all()) as unknown as { title: string; visits: number; revenue: number }[]

  const staff = (await db
    .prepare(
      `SELECT v.staff_name AS name, COUNT(DISTINCT v.yclients_record_id) AS visits,
              COALESCE(SUM(v.service_cost),0) AS revenue
         FROM care_visits v
        WHERE COALESCE(v.staff_name,'') <> '' AND ${NOT_EXCLUDED}
        GROUP BY v.staff_name ORDER BY revenue DESC LIMIT 8`,
    )
    .all()) as unknown as { name: string; visits: number; revenue: number }[]

  const came = n("came")
  const missed = n("missed")
  // 🔒 У `attendance` ЧЕТЫРЕ ЗНАЧЕНИЯ, А НЕ ДВА, И ЭТО ОПЛАЧЕНО.
  // ✗ 2026-08-25 здесь стояло «пришёл = 1, всё остальное = не пришёл», и экран
  // показал долю неявок 79% — при 1326 пришедших и 61 настоящей неявке. Живая
  // раскладка филиала: `1` пришёл (1326), `-1` не пришёл (61), `0` ждёт отметки
  // (3310), `2` подтверждён (1535).
  //
  // `0` и `2` — это НЕ ЯВКА И НЕ ПРОГУЛ, а «ещё не решено». Сложить их с
  // прогулами значит обвинить в неявке четыре тысячи человек, которые просто
  // записаны или которым администратор не поставил отметку.
  //
  // 🔒 ДОЛЯ СЧИТАЕТСЯ ТОЛЬКО ОТ РАЗРЕШЁННЫХ (`1` и `-1`). Неотмеченное не
  // участвует ни в числителе, ни в знаменателе: это объём небрежности в CRM, а
  // не поведение людей.
  const marked = came + missed
  const revVisits = n("revVisits")

  return {
    people: n("people"),
    peopleWithVisits: n("peopleWithVisits"),
    noFutureBooking: n("noFutureBooking"),
    recency: {
      d0_30: n("d0_30"), d31_90: n("d31_90"), d91_180: n("d91_180"),
      d181_365: n("d181_365"), d365plus: n("d365plus"), never: n("neverVisited"),
    },
    attendance: {
      came, missed, unknown: n("unknownAtt"),
      missedShare: marked > 0 ? Math.round((missed / marked) * 100) : null,
    },
    revenue: {
      total: n("revenue"),
      visits: revVisits,
      avgCheck: revVisits > 0 ? Math.round(n("revenue") / revVisits) : 0,
      excludedRevenue: n("excludedRevenue"),
    },
    topServices: top,
    byStaff: staff,
  }
}
