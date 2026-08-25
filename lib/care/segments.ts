import "server-only"
import { db } from "@/lib/db"

// ПОВЕДЕНЧЕСКИЕ СЕГМЕНТЫ — кого и почему стоит коснуться.
//
// Самое ценное, что есть в исходнике: он считает не «все, кто не был 90 дней», а
// сравнивает человека С НИМ ЖЕ. Тот, кто ходил раз в месяц и пропал на три, —
// тревога; тот, кто всегда ходил раз в полгода, — нет.
//
// 🔒 СЧИТАЕТСЯ ИЗ ИСТОРИИ ВИЗИТОВ, А НЕ ИЗ КОЛОНОК ДЕЛА. Колонки
// `last_visit_date` / `next_visit_date` заполнены у меньшинства карточек — это
// записал автор исходника про собственную базу. Опираться на них — строить отчёт
// на трети данных и не знать об этом.
//
// 🔒 МЕДИАНА СЧИТАЕТСЯ ЗДЕСЬ, А НЕ В SQL — И ЭТО ВЫНУЖДЕННО.
// В исходнике сегменты написаны на PostgreSQL: `PERCENTILE_CONT(0.5) WITHIN
// GROUP (…)`, `COUNT(*) FILTER (WHERE …)`, `to_char`, `::date`. Ни одной из этих
// вещей нет в SQLite, на котором стоит этот проект. Дословный перенос невозможен,
// и притвориться, что возможен, значило бы получить запрос, не выполняющийся ни
// разу.
//
// Поэтому из базы забирается СЫРАЯ история, а медианы и пороги считаются на
// TypeScript. Цена названа вслух: вся история визитов проходит через память
// процесса. Для одного учреждения это тысячи строк, и это приемлемо; когда
// перестанет быть — считать порогами в SQL, а не ждать `PERCENTILE_CONT`.
//
// ✗ 🔒 СОСТАВНЫХ СТРОКОВЫХ КЛЮЧЕЙ ЗДЕСЬ НЕТ, И ЭТО НЕ ВКУСОВЩИНА. Первая
// редакция складывала «человек + услуга» в одну строку через пробел и разбирала
// обратно по пробелу — а названия услуг состоят из нескольких слов
// («Биоревитализация лица»), и вместо услуги возвращалось её первое слово.
// Дефект молчаливый: код работает, сегменты считаются, числа неверны. Вложенная
// карта не даёт его совершить вовсе.

/** Медиана списка. Пустой список — `null`, а не ноль: ноль здесь соврал бы. */
function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Разница в днях между двумя датами вида YYYY-MM-DD. */
function days(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

const today = () => new Date().toISOString().slice(0, 10)

/** Вложенная карта: человек → услуга → значение. Без составных ключей. */
function nested<V>(map: Map<string, Map<string, V>>, person: string): Map<string, V> {
  let inner = map.get(person)
  if (!inner) { inner = new Map<string, V>(); map.set(person, inner) }
  return inner
}

function push(map: Map<string, number[]>, key: string, value: number): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

type VisitRow = { person_id: string; visit_date: string; service_title: string; service_cost: number | null }

/** Вся история визитов, привязанных к людям, по возрастанию даты. */
async function history(): Promise<VisitRow[]> {
  const rows = await db
    .prepare(
      `SELECT person_id, visit_date, service_title, service_cost
       FROM care_visits
       WHERE person_id IS NOT NULL AND COALESCE(service_title,'') <> ''
       ORDER BY person_id, visit_date`,
    )
    .all()
  return rows as unknown as VisitRow[]
}

/** Кто записан вперёд — таких не тревожат. */
async function bookedAhead(): Promise<Set<string>> {
  const rows = (await db
    .prepare(
      `SELECT DISTINCT person_id FROM care_visits
       WHERE person_id IS NOT NULL AND visit_date > date('now')`,
    )
    .all()) as unknown as { person_id: string }[]
  return new Set(rows.map(r => r.person_id))
}

export type SegmentKey =
  | "overdue_cycle"
  | "broken_course"
  | "no_future"
  | "lapsed_personal"
  | "birthday"
  | "top_value"

export const SEGMENT_KEYS: SegmentKey[] = [
  "overdue_cycle",
  "broken_course",
  "no_future",
  "lapsed_personal",
  "birthday",
  "top_value",
]

/**
 * Идентификаторы людей в каждом сегменте.
 *
 * 🔒 ОДИН ПРОХОД ПО ИСТОРИИ НА ВСЕ ШЕСТЬ. Шесть отдельных запросов читали бы одни
 * и те же строки шесть раз и однажды разошлись бы в определении «последнего
 * визита» — а число на кнопке сегмента обязано совпадать со списком под ней.
 */
export async function segmentMembers(): Promise<Record<SegmentKey, Set<string>>> {
  const rows = await history()
  const ahead = await bookedAhead()
  const now = today()

  /** Промежутки между повторами одной услуги — по услуге, для медианного цикла. */
  const gapsByService = new Map<string, number[]>()
  /** Промежутки между визитами человека — для его личного ритма. */
  const gapsByPerson = new Map<string, number[]>()
  /** Человек → услуга → дата последнего состоявшегося визита по ней. */
  const lastByPersonService = new Map<string, Map<string, string>>()
  /** Человек → услуга → сколько раз делал. */
  const timesByPersonService = new Map<string, Map<string, number>>()
  const lastByPerson = new Map<string, string>()
  const totalByPerson = new Map<string, number>()
  /** Человек → услуга → дата предыдущего визита по ней (рабочее состояние прохода). */
  const prevByPersonService = new Map<string, Map<string, string>>()

  let prevPerson: string | null = null
  let prevDate: string | null = null

  for (const r of rows) {
    const service = r.service_title

    // Промежуток между ЛЮБЫМИ соседними визитами человека — строки приходят
    // упорядоченными по человеку и дате, поэтому предыдущая строка того же
    // человека и есть его предыдущий визит.
    if (r.person_id === prevPerson && prevDate) {
      const d = days(prevDate, r.visit_date)
      // Окно 3–730 дней выбрасывает опечатки в датах и «повторы» внутри дня.
      if (d >= 3 && d <= 730) push(gapsByPerson, r.person_id, d)
    }
    prevPerson = r.person_id
    prevDate = r.visit_date

    const prevSame = nested<string>(prevByPersonService, r.person_id).get(service)
    if (prevSame) {
      const d = days(prevSame, r.visit_date)
      if (d >= 3 && d <= 730) push(gapsByService, service, d)
    }
    nested<string>(prevByPersonService, r.person_id).set(service, r.visit_date)

    if (r.visit_date <= now) {
      nested<string>(lastByPersonService, r.person_id).set(service, r.visit_date)
      const seen = lastByPerson.get(r.person_id)
      if (!seen || r.visit_date > seen) lastByPerson.set(r.person_id, r.visit_date)
    }

    totalByPerson.set(r.person_id, (totalByPerson.get(r.person_id) ?? 0) + (r.service_cost ?? 0))
    const times = nested<number>(timesByPersonService, r.person_id)
    times.set(service, (times.get(service) ?? 0) + 1)
  }

  // Медианный цикл услуги. Порог в 10 повторов отсекает услуги, по которым
  // статистики не хватает: медиана по трём наблюдениям — это не медиана.
  const cycle = new Map<string, number>()
  for (const [service, gaps] of gapsByService) {
    if (gaps.length < 10) continue
    const m = median(gaps)
    if (m !== null) cycle.set(service, m)
  }

  const out: Record<SegmentKey, Set<string>> = {
    overdue_cycle: new Set(),
    broken_course: new Set(),
    no_future: new Set(),
    lapsed_personal: new Set(),
    birthday: new Set(),
    top_value: new Set(),
  }

  // Просрочен цикл: прошло больше 1,3 цикла услуги, новой записи нет.
  // Верхняя граница в 400 дней отсекает ушедших совсем — их возвращают иначе.
  for (const [person, byService] of lastByPersonService) {
    if (ahead.has(person)) continue
    for (const [service, last] of byService) {
      const c = cycle.get(service)
      if (c === undefined) continue
      const gone = days(last, now)
      if (gone > c * 1.3 && gone < 400) { out.overdue_cycle.add(person); break }
    }
  }

  // Курс брошен: курсовая процедура сделана ровно один раз. Самый тёплый
  // сегмент — человек уже заплатил и уже решился.
  //
  // 🔒 КАКАЯ ПРОЦЕДУРА КУРСОВАЯ, РЕШАЕТ КАТАЛОГ (`care_service_protocols.is_course`).
  // ✗ В исходнике это было условие `service_title ILIKE '%PRP%' OR ILIKE
  // '%биоревитал%'` в двух запросах сразу: названия услуг одной клиники жили в
  // коде, и следующее учреждение сломало бы сегмент молча.
  const courseRows = (await db
    .prepare(`SELECT service_title FROM care_service_protocols WHERE is_course = 1`)
    .all()) as unknown as { service_title: string }[]
  const courses = new Set(courseRows.map(r => r.service_title))
  for (const [person, byService] of timesByPersonService) {
    for (const [service, times] of byService) {
      if (times === 1 && courses.has(service)) { out.broken_course.add(person); break }
    }
  }

  // Есть визиты, но вперёд не записан.
  for (const person of lastByPerson.keys()) if (!ahead.has(person)) out.no_future.add(person)

  // Выпал из СВОЕГО ритма: не был вдвое дольше, чем ходил обычно.
  // Нужно не меньше трёх промежутков — иначе «обычно» не существует.
  for (const [person, gaps] of gapsByPerson) {
    if (gaps.length < 3) continue
    const m = median(gaps)
    const last = lastByPerson.get(person)
    if (m === null || !last) continue
    const gone = days(last, now)
    if (gone > 2 * m && gone < 500) out.lapsed_personal.add(person)
  }

  // Скоро день рождения — единственный повод, не требующий услуги.
  // Сравнение по месяцу и дню; год игнорируется, и переход через новый год
  // получается сам собой, потому что набор дат строится вперёд от сегодня.
  const birthdays = (await db
    .prepare(`SELECT id, birth_date FROM care_people WHERE birth_date IS NOT NULL`)
    .all()) as unknown as { id: string; birth_date: string }[]
  const window = new Set<string>()
  for (let i = 0; i <= 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    window.add(d.toISOString().slice(5, 10))
  }
  for (const b of birthdays) if (window.has(b.birth_date.slice(5, 10))) out.birthday.add(b.id)

  // Сто человек с наибольшей суммой за всё время.
  const top = [...totalByPerson.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100)
  for (const [person] of top) out.top_value.add(person)

  return out
}

/** Сколько людей в каждом сегменте — теми же условиями, что и сам список. */
export async function segmentCounts(): Promise<Record<SegmentKey, number>> {
  const members = await segmentMembers()
  return Object.fromEntries(SEGMENT_KEYS.map(k => [k, members[k].size])) as Record<SegmentKey, number>
}
