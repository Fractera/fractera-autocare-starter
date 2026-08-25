import "server-only"
import { db } from "@/lib/db"

// УСЛУГИ И ПРОТОКОЛЫ СОПРОВОЖДЕНИЯ.
//
// 🔒 КАТАЛОГ РОДИЛСЯ ИЗ ФАКТА, А НЕ ИЗ СПРАВОЧНИКА. Строки заводит синхронизация
// из того, что реально оказывали (шаг 11): отдельного списка услуг у нас нет, а
// протоколы врачи пишут именно к этим строкам. Услуга, которой никогда не
// оказывали, в каталоге не появится — и это правильно.

export type CareService = {
  id: string
  service_title: string
  category: string | null
  protocol_text: string | null
  is_course: number
  excluded: number
  /** Сколько раз услугу оказывали — по истории визитов. */
  visits: number
  /** Сколько человек её получали. */
  people: number
  /** Выручка по услуге. */
  revenue: number
  /** Когда оказывали в последний раз. */
  last_used: string | null
}

/**
 * Каталог с мерой: сколько раз оказывали, скольким людям, на какую сумму.
 *
 * 🔒 ЧИСЛА СЧИТАЮТСЯ ИЗ `care_visits`, А НЕ ХРАНЯТСЯ В КАТАЛОГЕ. Хранимый
 * счётчик расходится с действительностью в день первой же правки истории; а
 * главное — без этих чисел каталог не отвечает на единственный вопрос, ради
 * которого его открывают: «какие услуги вообще имеют значение».
 */
export async function servicesList(
  { q, category }: { q?: string; category?: string } = {},
): Promise<CareService[]> {
  const where: string[] = []
  const args: string[] = []
  if (q?.trim()) { where.push("sp.service_title LIKE ?"); args.push(`%${q.trim()}%`) }
  if (category?.trim()) { where.push("sp.category = ?"); args.push(category.trim()) }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : ""

  const rows = await db
    .prepare(
      `SELECT sp.id, sp.service_title, sp.category, sp.protocol_text, sp.is_course, sp.excluded,
              COALESCE(v.visits, 0)  AS visits,
              COALESCE(v.people, 0)  AS people,
              COALESCE(v.revenue, 0) AS revenue,
              v.last_used
         FROM care_service_protocols sp
         LEFT JOIN (
           SELECT service_title,
                  COUNT(*)                        AS visits,
                  COUNT(DISTINCT person_id)       AS people,
                  COALESCE(SUM(service_cost), 0)  AS revenue,
                  MAX(visit_date)                 AS last_used
             FROM care_visits
            WHERE COALESCE(service_title,'') <> ''
            GROUP BY service_title
         ) v ON v.service_title = sp.service_title
         ${whereSql}
        ORDER BY visits DESC, sp.service_title`,
    )
    .all(...args)
  return rows as unknown as CareService[]
}

/** Разделы каталога. Пустой раздел не существует: категория — свойство строки. */
export async function serviceCategories(): Promise<string[]> {
  const rows = (await db
    .prepare(
      `SELECT DISTINCT category FROM care_service_protocols
        WHERE COALESCE(category,'') <> '' ORDER BY category`,
    )
    .all()) as unknown as { category: string }[]
  return rows.map(r => r.category)
}

/** Сводка каталога: сколько услуг, у скольких написан протокол. */
export async function servicesSummary(): Promise<{
  total: number
  withProtocol: number
  courses: number
  excluded: number
  uncategorised: number
}> {
  const row = (await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN COALESCE(protocol_text,'') <> '' THEN 1 ELSE 0 END) AS withProtocol,
              SUM(is_course)  AS courses,
              SUM(excluded)   AS excluded,
              SUM(CASE WHEN COALESCE(category,'') = '' THEN 1 ELSE 0 END) AS uncategorised
         FROM care_service_protocols`,
    )
    .get()) as Record<string, number> | undefined
  const n = (k: string) => Number(row?.[k] ?? 0)
  return {
    total: n("total"),
    withProtocol: n("withProtocol"),
    courses: n("courses"),
    excluded: n("excluded"),
    uncategorised: n("uncategorised"),
  }
}

/**
 * Правка услуги.
 *
 * 🔒 НАЗВАНИЕ УСЛУГИ НЕ МЕНЯЕТСЯ. Оно приходит из CRM и служит ключом связи с
 * историей визитов: переименуй его здесь — и строка каталога оторвётся от всех
 * своих визитов молча, а числа обнулятся без объяснения. Название меняют в CRM.
 */
export async function updateService(
  id: string,
  patch: { category?: string | null; protocolText?: string | null; isCourse?: boolean; excluded?: boolean },
): Promise<boolean> {
  const before = (await db
    .prepare("SELECT id FROM care_service_protocols WHERE id = ?")
    .get(id)) as { id: string } | undefined
  if (!before) return false

  const sets: string[] = []
  const vals: unknown[] = []
  if (patch.category !== undefined) { sets.push("category = ?"); vals.push(patch.category?.trim() || null) }
  if (patch.protocolText !== undefined) { sets.push("protocol_text = ?"); vals.push(patch.protocolText?.trim() || null) }
  if (patch.isCourse !== undefined) { sets.push("is_course = ?"); vals.push(patch.isCourse ? 1 : 0) }
  if (patch.excluded !== undefined) { sets.push("excluded = ?"); vals.push(patch.excluded ? 1 : 0) }

  if (sets.length) {
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')")
    vals.push(id)
    await db.prepare(`UPDATE care_service_protocols SET ${sets.join(", ")} WHERE id = ?`).run(...vals)
  }
  return true
}
