import "server-only"
import { db } from "@/lib/db"
import { composeForTask } from "./compose"
import { sendMessage } from "./messages"
import { readChannelSettings } from "@/lib/company/channel-settings"

// ОТПРАВКА ПО РАСПИСАНИЮ — то, ради чего построено всё остальное (шаг 37).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА: ТЕКСТ УХОДИТ БЕЗ ПОДТВЕРЖДЕНИЯ (§3.39). Значит здесь нет человека,
// который поймает ошибку, — и каждый предохранитель ниже стоит вместо него.

export type TickReport = {
  looked: number
  sent: number
  skipped: { off: number; quiet: number; perDay: number; perWeek: number; noText: number; noConsent: number }
}

/**
 * Сейчас можно писать?
 *
 * 🔒 ЧАС СЧИТАЕТСЯ В ВРЕМЕНИ КЛИНИКИ, А НЕ СЕРВЕРА. Сервер живёт в UTC; «не раньше
 * десяти» без смещения означает час ночи в Кисловодске — то есть ровно ту беду, от
 * которой окно и заводят.
 *
 * 🔒 ОКНО, ПЕРЕХОДЯЩЕЕ ЧЕРЕЗ ПОЛНОЧЬ, ТОЖЕ ЗАКОННО (с 22 до 8): условие тогда «или», а не
 * «и». Написать его через «и» — обычная ошибка, и она даёт вечно закрытое окно.
 */
export function withinQuietWindow(now: Date, from: number, to: number, offsetHours: number): boolean {
  const local = new Date(now.getTime() + offsetHours * 3600_000)
  const h = local.getUTCHours()
  return from <= to ? h >= from && h < to : h >= from || h < to
}

/**
 * Сколько сообщений человек получил за последние сутки и неделю.
 *
 * 🔒 СЧИТАЮТСЯ ИСХОДЯЩИЕ ЛЮБОГО ПРОИСХОЖДЕНИЯ — и от таймера, и от модели, и от живого
 * оператора. Человеку всё равно, кто нажал: он получил от клиники три сообщения за день.
 */
async function recentCount(personId: string): Promise<{ day: number; week: number }> {
  const row = (await db
    .prepare(
      `SELECT
         SUM(CASE WHEN created_at >= datetime('now','-1 day')  THEN 1 ELSE 0 END) AS day,
         SUM(CASE WHEN created_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS week
       FROM care_messages
      WHERE person_id = ? AND direction = 'outgoing'`,
    )
    .get(personId)) as { day?: number; week?: number } | undefined
  return { day: Number(row?.day ?? 0), week: Number(row?.week ?? 0) }
}

/**
 * Один заход таймера: разослать то, чей срок настал.
 *
 * 🔒 ОТЛОЖЕНО — НЕ ОТМЕНЕНО. Задача, не прошедшая окно или предел, остаётся в очереди со
 * своим сроком и уйдёт следующим заходом. Отмена здесь означала бы, что человек, попавший
 * под два правила, потерял второе навсегда, — а он всего лишь не должен получить оба
 * сразу.
 */
export async function tick(limit = 25): Promise<TickReport> {
  const s = readChannelSettings()
  const report: TickReport = {
    looked: 0,
    sent: 0,
    skipped: { off: 0, quiet: 0, perDay: 0, perWeek: 0, noText: 0, noConsent: 0 },
  }

  // 🔒 РУБИЛЬНИК ПРОВЕРЯЕТСЯ ПЕРВЫМ, ДО ВСЕГО ОСТАЛЬНОГО. Пока владелец не включил
  // рассылку, таймер не должен даже составлять тексты: обращение к модели стоит денег, а
  // выключенная рассылка означает, что этот текст никому не нужен.
  if (!s.sendingEnabled) {
    report.skipped.off = 1
    return report
  }

  // Окно проверяется ОДИН раз на заход, а не на каждую задачу: за секунды разбора час не
  // меняется, а лишние вычисления в цикле по сотне строк — плата ни за что.
  if (!withinQuietWindow(new Date(), s.quietFrom, s.quietTo, s.timezoneOffset)) {
    report.skipped.quiet = 1
    return report
  }

  const rows = (await db
    .prepare(
      // 🔒 БЕРУТСЯ ТОЛЬКО ТЕ, У КОГО СРОК НАСТУПИЛ И КТО ЕЩЁ НЕ ОТПРАВЛЕН. Отметка
      // отправки — `final_message`: без неё перезапуск таймера разослал бы всё заново.
      `SELECT t.id, t.person_id, p.phone, p.consent_to_contact AS consent, t.generated_message
         FROM care_tasks t
         JOIN care_people p ON p.id = t.person_id
        WHERE t.status IN ('new','in_progress')
          AND t.due_date <= date('now')
          AND t.final_message IS NULL
          AND COALESCE(p.is_test, 0) = 0
        ORDER BY t.due_date
        LIMIT ?`,
    )
    .all(limit)) as unknown as { id: string; person_id: string; phone: string; consent: number; generated_message: string | null }[]

  report.looked = rows.length

  for (const r of rows) {
    // Согласие проверяется ЗДЕСЬ ещё раз, хотя оно проверялось при заведении задачи:
    // между тем моментом и этим человек мог отказаться, и последнее слово за ним.
    if (!r.consent) { report.skipped.noConsent++; continue }

    const seen = await recentCount(r.person_id)
    if (seen.day >= s.perDay) { report.skipped.perDay++; continue }
    if (seen.week >= s.perWeek) { report.skipped.perWeek++; continue }

    // Текста нет — пишем его сейчас. Заранее писать все тексты незачем: часть задач
    // закроется руками, и заплаченное за них чтение модели пропало бы.
    let text = r.generated_message
    if (!text) {
      const made = await composeForTask(r.id)
      if (!made.ok) { report.skipped.noText++; continue }
      text = made.text
    }

    // 🔒 ОТПРАВКА ИДЁТ ОБЫЧНОЙ ДВЕРЬЮ ПЕРЕПИСКИ, а не своим путём: тогда сообщение
    // ложится в ту же ленту, что и ответы оператора, и человек видит РАЗГОВОР, а не два
    // несвязанных потока. Происхождение `timer` даёт оранжевую полосу на карточке.
    const msg = await sendMessage(r.phone, text, [], "auto", "timer")

    // Отметка ставится по факту записи сообщения, а не по ответу службы: доставку она
    // подтверждает позже своим событием (закон шага 35).
    await db
      .prepare(`UPDATE care_tasks SET final_message = ?, status = 'contacted', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
      .run(text, r.id)

    if (msg.delivery !== "failed") report.sent++
  }

  return report
}
