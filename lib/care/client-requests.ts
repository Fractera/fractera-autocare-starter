import "server-only"
import { db } from "@/lib/db"

// ЗАЯВКА «ХОЧУ СТАТЬ КЛИЕНТОМ» — её оставляет вошедший человек с ролью `user`.
//
// 🔒 ФОРМА, ПИШУЩАЯ В НИКУДА, — ОБЕЩАНИЕ, КОТОРОГО ПРОДУКТ НЕ СДЕРЖИТ. Человек отправил,
// ему сказали «отправлено», и никто никогда этого не увидел. Поэтому у заявки есть и
// таблица, и экран, на котором её видит менеджер, — иначе кнопку не стоило бы делать.

export type ClientRequest = {
  id: string
  user_id: string
  full_name: string
  email: string
  status: "new" | "contacted" | "accepted" | "declined"
  note: string | null
  created_at: string
  updated_at: string
}

const OPEN = ["new", "contacted"] as const

/** Открытая заявка этого человека, если она есть. `null` — можно подавать новую. */
export async function myOpenRequest(userId: string): Promise<ClientRequest | null> {
  const row = (await db
    .prepare(
      `SELECT id, user_id, full_name, email, status, note, created_at, updated_at
         FROM care_client_requests
        WHERE user_id = ? AND status IN ('new','contacted')
        ORDER BY rowid DESC LIMIT 1`,
    )
    .get(userId)) as unknown as ClientRequest | undefined
  return row ?? null
}

/**
 * Принять заявку.
 *
 * 🔒 ПОЧТА ПРИХОДИТ ИЗ СЕССИИ, А НЕ ИЗ ФОРМЫ, и это решение о безопасности, а не об
 * удобстве. Позволь править её на экране — и любой вошедший подаст заявку от чужого
 * имени; менеджер, который по ней свяжется, попадёт не туда. Здесь она даже не
 * принимается параметром: берётся у того, кто стучится.
 *
 * 🔒 ВТОРАЯ ОТКРЫТАЯ ЗАЯВКА НЕ ЗАВОДИТСЯ. Проверка стоит и здесь, и уникальным индексом
 * в базе: код отвечает человеку словами, индекс не даёт гонке двух нажатий положить две
 * строки. Тот же приём, что у задач.
 */
export async function createRequest(
  userId: string,
  email: string,
  fullName: string,
): Promise<{ ok: true; request: ClientRequest } | { ok: false; error: "exists" | "empty" }> {
  const name = fullName.trim()
  if (!name) return { ok: false, error: "empty" }

  const open = await myOpenRequest(userId)
  if (open) return { ok: false, error: "exists" }

  const id = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  try {
    await db
      .prepare(
        `INSERT INTO care_client_requests (id, user_id, full_name, email) VALUES (?,?,?,?)`,
      )
      .run(id, userId, name.slice(0, 120), email.slice(0, 200))
  } catch (e) {
    // Индекс сработал раньше нас — гонка двух нажатий. Это не ошибка сервера.
    if (/UNIQUE|constraint/i.test(String(e))) return { ok: false, error: "exists" }
    throw e
  }

  const created = await myOpenRequest(userId)
  // 🔒 СОСТОЯНИЕ СНИМАЕТСЯ ЗАПРОСОМ, А НЕ СОБИРАЕТСЯ ИЗ ТОГО, ЧТО ОТПРАВИЛИ (закон ⑰).
  if (!created) return { ok: false, error: "empty" }
  return { ok: true, request: created }
}

/** Заявки для менеджера: свежие сверху, открытые прежде разобранных. */
export async function listRequests(limit = 50): Promise<ClientRequest[]> {
  const rows = await db
    .prepare(
      `SELECT id, user_id, full_name, email, status, note, created_at, updated_at
         FROM care_client_requests
        ORDER BY CASE WHEN status IN ('new','contacted') THEN 0 ELSE 1 END,
                 created_at DESC
        LIMIT ?`,
    )
    .all(limit)
  return rows as unknown as ClientRequest[]
}

/** Сколько заявок ждёт разбора. Для плитки на экране «Клиенты». */
export async function openRequestCount(): Promise<number> {
  const row = (await db
    .prepare(`SELECT COUNT(*) AS n FROM care_client_requests WHERE status IN ('new','contacted')`)
    .get()) as { n?: number } | undefined
  return Number(row?.n ?? 0)
}

export { OPEN }
