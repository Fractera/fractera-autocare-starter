import "server-only"
import { db } from "@/lib/db"
import { normalizePhone } from "./phone"

// ТЕСТОВЫЙ КЛИЕНТ — копия настоящего, на которой безопасно проверять продукт (шаг 30).
//
// 🔒 ПОЧЕМУ КОПИЯ, А НЕ ВЫДУМАННЫЕ ДАННЫЕ (заказ Ромы 2026-08-25: «вместо того чтобы
// изобретать с нуля, просто перекопировать себе его записи»). Выдуманная история визитов
// не похожа на настоящую ничем, что важно: у неё ровные суммы, ровные промежутки и нет
// пропусков. Правила, сегменты и аналитика на такой истории ведут себя не так, как на
// живой, — то есть проверка показывает не то, что будет в работе.
//
// 🔒 ПОЧЕМУ В ТЕХ ЖЕ ТАБЛИЦАХ, А НЕ В БРАУЗЕРЕ. Владелец предложил хранить это «например,
// в локальном хранилище браузера». Так нельзя: все экраны продукта — люди, задачи,
// аналитика, переписка — читают БАЗУ НА СЕРВЕРЕ, и браузерное хранилище ему недоступно в
// принципе. Тестовый клиент оттуда был бы виден на одной вкладке одного компьютера.
//
// 🔒 ПОЭТОМУ ПРИЗНАК `is_test` ОБЯЗАТЕЛЕН. Тестовый человек, неотличимый от настоящего,
// попадёт в рассылку по правилу «не был 60 дней» и в счётчики аудита — исказит и деньги,
// и решения. Признак и есть та граница, которая делает проверку безопасной.

export type TestClientResult =
  | { ok: true; id: string; name: string; phone: string; visits: number; copiedFrom: string }
  | { ok: false; error: "no-phone" | "no-source" | "exists" }

/**
 * Имя тестового клиента — заказ Ромы 2026-08-25: «настоящее имя из базы использовать не
 * будем, давай имя-заглушку Рома Армстронг, сразу будет понятно, что это тестовый».
 *
 * 🔒 ИМЯ ВЛАДЕЛЬЦА И ЕСТЬ ЛУЧШАЯ ПОМЕТКА. Оператор, увидевший в очереди задач имя своего
 * же руководителя, поймёт всё без расследования — лучше, чем от слова «ТЕСТ», которое
 * глаз через неделю перестаёт замечать. И спутать с пациенткой Татьяной невозможно.
 */
const TEST_NAME = "Рома Армстронг"

/**
 * Создать тестового клиента копированием одного из самых ценных.
 *
 * 🔒 БЕРЁТСЯ КЛИЕНТ ИЗ ТОП-3 ПО ВЫРУЧКЕ (как просил владелец) — у него заведомо есть
 * история: визиты, услуги, суммы. Копировать бедную карточку значило бы получить тест, на
 * котором половина экранов пуста.
 */
export async function createTestClient(rawPhone: string): Promise<TestClientResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { ok: false, error: "no-phone" }

  const existing = (await db
    .prepare(`SELECT id FROM care_people WHERE phone = ?`)
    .get(phone)) as { id?: string } | undefined
  if (existing?.id) return { ok: false, error: "exists" }

  // Образец: третий по выручке. 🔒 Не первый — самый ценный клиент чаще других попадает в
  // разговоры и отчёты, и увидеть его историю продублированной неприятно даже под другим
  // именем.
  const source = (await db
    .prepare(
      `SELECT p.id, p.full_name, SUM(COALESCE(v.service_cost, 0)) AS ltv
         FROM care_people p
         JOIN care_visits v ON v.person_id = p.id
        WHERE COALESCE(p.is_test, 0) = 0
        GROUP BY p.id
        ORDER BY ltv DESC
        LIMIT 3`,
    )
    .all()) as unknown as { id: string; full_name: string; ltv: number }[]

  const donor = source[2] ?? source[0]
  if (!donor) return { ok: false, error: "no-source" }

  const id = `test-${Date.now().toString(36)}`
  await db
    .prepare(
      `INSERT INTO care_people (id, full_name, phone, email, consent_to_contact, comment, is_test)
       VALUES (?,?,?,NULL,1,?,1)`,
    )
    .run(id, TEST_NAME, phone, "Создан кнопкой в настройках компании для проверки канала.")

  // 🔒 ВИЗИТЫ КОПИРУЮТСЯ, А НЕ ССЫЛАЮТСЯ. Правка тестовых данных не должна касаться
  // настоящего человека — и обратно: удаление теста не должно уносить его историю.
  //
  // 🔒 `yclients_record_id` ПОЛУЧАЕТ СВОЙ ПРЕФИКС. Колонка входит в ключ уникальности
  // (запись CRM + услуга); скопируй её как есть — и вставка молча упрётся в конфликт с
  // визитами донора.
  await db
    .prepare(
      `INSERT INTO care_visits
         (id, person_id, yclients_record_id, visit_date, attendance, staff_name, service_title, service_cost, is_test)
       SELECT 'tv-' || v.id, ?, 'test-' || v.yclients_record_id, v.visit_date, v.attendance,
              v.staff_name, v.service_title, v.service_cost, 1
         FROM care_visits v
        WHERE v.person_id = ?`,
    )
    .run(id, donor.id)

  const count = (await db
    .prepare(`SELECT COUNT(*) AS n FROM care_visits WHERE person_id = ?`)
    .get(id)) as { n?: number } | undefined

  return {
    ok: true,
    id,
    name: TEST_NAME,
    phone,
    // 🔒 ЧИСЛО СНИМАЕТСЯ ЗАПРОСОМ, А НЕ СЧИТАЕТСЯ ПО ОТПРАВЛЕННОМУ (закон ⑰).
    visits: Number(count?.n ?? 0),
    copiedFrom: donor.full_name,
  }
}

/** Убрать всё тестовое. Одной кнопкой — иначе тест переживёт проверку и осядет в цифрах. */
export async function removeTestClients(): Promise<number> {
  await db.prepare(`DELETE FROM care_visits WHERE is_test = 1`).run()
  await db.prepare(`DELETE FROM care_people WHERE is_test = 1`).run()
  const row = (await db
    .prepare(`SELECT COUNT(*) AS n FROM care_people WHERE is_test = 1`)
    .get()) as { n?: number } | undefined
  return Number(row?.n ?? 0)
}

/** Есть ли сейчас тестовый клиент — экран спрашивает, чтобы не предлагать создать второго. */
export async function testClientPhone(): Promise<string | null> {
  const row = (await db
    .prepare(`SELECT phone FROM care_people WHERE is_test = 1 ORDER BY rowid DESC LIMIT 1`)
    .get()) as { phone?: string } | undefined
  return row?.phone ?? null
}
